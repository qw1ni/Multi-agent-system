"""
Главный оркестратор парсинга: находит корневые разделы, раздаёт их агентам роя
(один агент — один раздел), запускает их параллельно, следит и собирает итог.
"""

import logging
import os
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

from app.providers.db_manager import DatabaseManager
from app.providers.log_sender import LogSender
from app.providers.parser import SiteCrawler
from app.repositories.material_repository import MaterialRepository
from app.swarm.section_agent import SectionParserAgent

logger = logging.getLogger(__name__)

LOG_PREFIX = "[Оркестратор]"
STAT_KEYS = ("nodes", "processed", "saved", "skipped_known", "skipped_no_file", "failed_batches")


def _now():
    return datetime.now(timezone.utc).isoformat()


class ParsingOrchestrator:
    def __init__(self):
        self._state_lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread = None
        self._agents = []
        self.mode = None
        self.started_at = None
        self.finished_at = None
        self.last_error = None

    def _log(self, message: str, level: str = "INFO"):
        text = f"{LOG_PREFIX} {message}"
        if level == "ERROR":
            logger.error(text)
        else:
            logger.info(text)
        LogSender().send_log(text, level)

    def is_running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def start(self, mode: str = "full") -> bool:
        with self._state_lock:
            if self.is_running():
                return False
            self._stop_event.clear()
            self._agents = []
            self.mode = mode
            self.started_at = _now()
            self.finished_at = None
            self.last_error = None
            self._thread = threading.Thread(target=self._run, args=(mode,), daemon=True)
            self._thread.start()
            return True

    def stop(self) -> bool:
        if not self.is_running():
            return False
        self._stop_event.set()
        self._log("Получена команда остановки — агенты завершат текущий материал и остановятся", "WARNING")
        return True

    def _discover_sections(self):
        crawler = SiteCrawler(
            base_url=os.getenv("BASE_URL"),
            faculties_link=os.getenv("FACULTIES_LINK"),
        )
        main_html = crawler.fetch_page(crawler.base_url)
        if not main_html:
            return None
        return crawler.parse_root_sections(main_html)

    @staticmethod
    def _load_known_handles():
        db = DatabaseManager()
        try:
            if not db.conn:
                raise RuntimeError("нет подключения к БД")
            return MaterialRepository(db).get_known_material_handles()
        finally:
            db.close()

    def _run(self, mode: str):
        try:
            self._run_swarm(mode)
        except Exception as e:
            logger.exception("Оркестратор упал")
            self.last_error = str(e)
            self._log(f"Аварийное завершение: {e}", "ERROR")
        finally:
            self.finished_at = _now()

    def _run_swarm(self, mode: str):
        incremental = mode == "incremental"
        self._log(
            "Запуск роя парсинга (только новые материалы)..."
            if incremental else
            "Запуск роя парсинга (с нуля, все материалы)..."
        )

        known_handles = None
        if incremental:
            known_handles = self._load_known_handles()
            self._log(f"Уже в БД материалов: {len(known_handles)} — агенты их пропустят")

        roots = self._discover_sections()
        if roots is None:
            self.last_error = "главная страница недоступна"
            self._log("Не удалось загрузить главную страницу", "ERROR")
            return
        if not roots:
            self.last_error = "корневые разделы не найдены"
            self._log("Корневые разделы на главной не найдены", "ERROR")
            return

        self._agents = [
            SectionParserAgent(i, root, self._stop_event, known_handles)
            for i, root in enumerate(roots, start=1)
        ]
        max_workers = max(1, min(int(os.getenv("SWARM_MAX_AGENTS", len(roots))), len(roots)))

        self._log(f"Найдено разделов: {len(roots)}. Агентов в рое: {len(self._agents)}, "
                  f"одновременно работают: {max_workers}")
        for agent in self._agents:
            self._log(f"{agent.name} → раздел «{agent.section}»")

        with ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="swarm-agent") as pool:
            futures = [pool.submit(agent.run) for agent in self._agents]
            for future in as_completed(futures):
                agent = future.result()
                self._report_agent(agent)

        self._report_total()

    def _report_agent(self, agent: SectionParserAgent):
        stats = agent.snapshot()["stats"]
        details = (f"новых в БД: {stats.get('saved', 0)}, "
                   f"обработано: {stats.get('processed', 0)}, "
                   f"пропущено (уже в БД): {stats.get('skipped_known', 0)}")
        if agent.state == SectionParserAgent.DONE:
            self._log(f"{agent.name} («{agent.section}») закончил: {details}", "SUCCESS")
        elif agent.state == SectionParserAgent.STOPPED:
            self._log(f"{agent.name} («{agent.section}») остановлен: {details}", "WARNING")
        else:
            self._log(f"{agent.name} («{agent.section}») завершился с ошибкой: {agent.error}", "ERROR")

    def _report_total(self):
        totals = self._totals()
        states = [a.state for a in self._agents]
        done = states.count(SectionParserAgent.DONE)
        summary = (f"агентов успешно: {done}/{len(states)}, "
                   f"записано материалов: {totals['saved']}, "
                   f"пропущено уже существующих: {totals['skipped_known']}, "
                   f"без файла: {totals['skipped_no_file']}")
        if self._stop_event.is_set():
            self._log(f"Парсинг остановлен пользователем. Итого: {summary}", "WARNING")
        else:
            self._log(f"Парсинг завершен. Итого: {summary}", "SUCCESS")

    def _totals(self) -> dict:
        totals = {key: 0 for key in STAT_KEYS}
        for agent in self._agents:
            stats = agent.snapshot()["stats"]
            for key in STAT_KEYS:
                totals[key] += int(stats.get(key, 0))
        return totals

    def status(self) -> dict:
        return {
            "running": self.is_running(),
            "stopping": self.is_running() and self._stop_event.is_set(),
            "mode": self.mode,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "last_error": self.last_error,
            "agents": [agent.snapshot() for agent in self._agents],
            "totals": self._totals(),
        }


parsing_orchestrator = ParsingOrchestrator()
