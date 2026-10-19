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
STAT_KEYS = ("nodes", "processed", "saved", "skipped_known", "skipped_no_file",
             "failed_batches", "failed_materials")


def _now():
    return datetime.now(timezone.utc).isoformat()


class ParsingOrchestrator:
    def __init__(self):
        self._state_lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread = None
        self._agents = []
        self.mode = None
        self.sections = None
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

    def start(self, mode: str = "full", sections=None) -> bool:
        with self._state_lock:
            if self.is_running():
                return False
            self._stop_event.clear()
            self._agents = []
            self.mode = mode
            self.sections = list(sections) if sections else None
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

        if self.sections:
            roots = self._select_sections(roots, self.sections)
            if not roots:
                self.last_error = "выбранные разделы не найдены на сайте"
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
            futures = [pool.submit(self._supervise, agent) for agent in self._agents]
            for future in as_completed(futures):
                agent = future.result()
                self._report_agent(agent)

        self._report_total()

    def _select_sections(self, roots, wanted):
        def norm(name):
            return " ".join(str(name).split()).casefold()

        by_name = {norm(root["name"]): root for root in roots}
        selected, missing = [], []
        for name in wanted:
            root = by_name.get(norm(name))
            if root is None:
                missing.append(name)
            elif root not in selected:
                selected.append(root)

        if missing:
            available = ", ".join(root["name"] for root in roots)
            self._log(f"На сайте нет разделов: {', '.join(missing)}. Доступны: {available}",
                      "ERROR" if not selected else "WARNING")
        if selected:
            self._log(f"Выбраны разделы: {', '.join(root['name'] for root in selected)} "
                      f"(из {len(roots)} на сайте)")
        return selected

    def _supervise(self, agent: SectionParserAgent) -> SectionParserAgent:
        """Запускает агента и перезапускает его после падения, пока не кончатся попытки."""
        max_restarts = max(0, int(os.getenv("SWARM_AGENT_MAX_RESTARTS", "3")))
        base_delay = max(0.0, float(os.getenv("SWARM_AGENT_RESTART_DELAY", "5")))

        while True:
            agent.run()
            if agent.state != SectionParserAgent.FAILED or self._stop_event.is_set():
                return agent
            if agent.restarts >= max_restarts:
                self._log(f"{agent.name} («{agent.section}») упал {agent.restarts + 1} раз — "
                          f"больше не перезапускаю. Последняя ошибка: {agent.error}", "ERROR")
                return agent

            agent.restarts += 1
            delay = base_delay * agent.restarts
            agent.state = SectionParserAgent.RESTARTING
            self._log(f"{agent.name} («{agent.section}») упал: {agent.error}. "
                      f"Перезапуск {agent.restarts}/{max_restarts} через {delay:g} с", "WARNING")
            if self._stop_event.wait(delay):
                agent.state = SectionParserAgent.STOPPED
                return agent

    def _report_agent(self, agent: SectionParserAgent):
        stats = agent.snapshot()["stats"]
        details = (f"новых в БД: {stats.get('saved', 0)}, "
                   f"обработано: {stats.get('processed', 0)}, "
                   f"пропущено (уже в БД): {stats.get('skipped_known', 0)}")
        if stats.get("failed_materials"):
            details += f", пропущено из-за ошибок разбора: {stats['failed_materials']}"
        if agent.restarts:
            details += f", перезапусков: {agent.restarts}"
        if agent.state == SectionParserAgent.DONE:
            self._log(f"{agent.name} («{agent.section}») закончил: {details}", "SUCCESS")
        elif agent.state == SectionParserAgent.STOPPED:
            self._log(f"{agent.name} («{agent.section}») остановлен: {details}", "WARNING")
        else:
            self._log(f"{agent.name} («{agent.section}») завершился с ошибкой: {agent.error}; {details}", "ERROR")

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
            "sections": self.sections,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "last_error": self.last_error,
            "agents": [agent.snapshot() for agent in self._agents],
            "totals": self._totals(),
        }


parsing_orchestrator = ParsingOrchestrator()
