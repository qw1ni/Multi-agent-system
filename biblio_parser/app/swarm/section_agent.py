"""
Агент-исполнитель роя: парсит один корневой раздел электронной библиотеки.

У каждого агента свой поток, свой HTTP-краулер и своё подключение к БД.
"""

import logging
import os
import threading
from datetime import datetime, timezone

from app.providers.db_manager import DatabaseManager
from app.providers.log_sender import LogSender
from app.providers.parser import SiteCrawler
from app.repositories.material_repository import MaterialRepository
from app.services.parser_service import ParserService

logger = logging.getLogger(__name__)


def _now():
    return datetime.now(timezone.utc).isoformat()


class SectionParserAgent:
    WAITING = "waiting"
    RUNNING = "running"
    DONE = "done"
    STOPPED = "stopped"
    FAILED = "failed"
    RESTARTING = "restarting"

    def __init__(self, agent_id: int, root: dict, stop_event: threading.Event, known_handles=None):
        self.agent_id = agent_id
        self.name = f"Агент-{agent_id}"
        self.root = root
        self.section = root["name"]
        self.stop_event = stop_event
        self.known_handles = known_handles
        self.state = self.WAITING
        self.error = None
        self.started_at = None
        self.finished_at = None
        self.service = None
        self.restarts = 0
        self.stats = {}
        self.done_handles = set()

    @property
    def log_prefix(self) -> str:
        return f"[{self.name} · {self.section}]"

    def run(self):
        if self.stop_event.is_set():
            self.state = self.STOPPED
            return self

        self.state = self.RUNNING
        self.error = None
        self.started_at = self.started_at or _now()
        self.finished_at = None
        db = DatabaseManager()
        try:
            if not db.conn:
                raise RuntimeError("нет подключения к БД")

            crawler = SiteCrawler(
                base_url=os.getenv("BASE_URL"),
                faculties_link=os.getenv("FACULTIES_LINK"),
            )
            self.service = ParserService(
                crawler,
                MaterialRepository(db),
                LogSender(),
                log_prefix=self.log_prefix,
                known_handles=self.known_handles,
                stop_event=self.stop_event,
                stats=self.stats,
                done_handles=self.done_handles,
            )
            if self.restarts:
                self.service._log(f"Перезапуск №{self.restarts}: продолжаю, уже записанные "
                                  f"материалы ({len(self.done_handles)}) пропущу")
            else:
                self.service._log("Начинаю работу")

            loaded = self.service.process_root_section(self.root)
            if not loaded:
                self.state = self.FAILED
                self.error = "не удалось загрузить раздел"
            elif self.stop_event.is_set():
                self.state = self.STOPPED
            else:
                self.state = self.DONE
        except Exception as e:
            logger.exception(f"{self.log_prefix} упал")
            self.state = self.FAILED
            self.error = str(e)
        finally:
            self.finished_at = _now()
            db.close()
        return self

    def snapshot(self) -> dict:
        return {
            "id": self.agent_id,
            "name": self.name,
            "section": self.section,
            "state": self.state,
            "current_node": self.service.current_node if self.service else None,
            "stats": dict(self.stats),
            "error": self.error,
            "restarts": self.restarts,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
        }
