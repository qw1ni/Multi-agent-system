"""
HTTP API конвертера для админки. Порт по умолчанию: 8004.

  GET  /api/converter/status   — идёт ли конвертация, прогресс, сводка по разделам, агенты роя
  POST /api/converter/start    — {"sections": [...] | null, "force": false}
  POST /api/converter/stop
"""

import logging
import os
import sys
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

import requests
import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel, Field

_PACKAGE_ROOT = Path(__file__).resolve().parents[1]
if str(_PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(_PACKAGE_ROOT))

from converter.config import ConverterConfig  # noqa: E402
from converter.swarm import ConversionSwarm  # noqa: E402
from converter.tasks import discover_tasks, section_stats  # noqa: E402

logger = logging.getLogger(__name__)
LOG_PREFIX = "[Конвертер]"


def _now():
    return datetime.now(timezone.utc).isoformat()


def send_log(message: str, level: str = "INFO"):
    """Логи в консоль мониторинга админки (тот же вебхук, что у парсера)."""
    url = (os.getenv("MAIN_SERVER_URL", "http://localhost:5001")
           + os.getenv("MAIN_SERVER_LOGS_ENDPOINT", "/api/admin/parser/logs"))
    try:
        requests.post(url, json={"level": level, "message": f"{LOG_PREFIX} {message}", "timestamp": _now()},
                      timeout=1.5)
    except requests.RequestException as e:
        logger.warning(f"Не удалось доставить лог в админку: {e}")


class ConversionManager:
    def __init__(self, config: ConverterConfig):
        self.config = config
        self.swarm = None
        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread = None
        self.progress = None
        self.sections = None
        self.force = False
        self.started_at = None
        self.finished_at = None
        self.last_error = None

    def is_running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def start(self, sections: Optional[List[str]], force: bool) -> bool:
        with self._lock:
            if self.is_running():
                return False
            self._stop_event.clear()
            self.sections = sections
            self.force = force
            self.progress = None
            self.started_at = _now()
            self.finished_at = None
            self.last_error = None
            self._thread = threading.Thread(target=self._run, daemon=True)
            self._thread.start()
            return True

    def stop(self) -> bool:
        if not self.is_running():
            return False
        self._stop_event.set()
        send_log("Получена команда остановки — агенты доделают текущие файлы и остановятся", "WARNING")
        return True

    def _set_progress(self, progress: dict):
        self.progress = progress

    def _run(self):
        try:
            label = ", ".join(self.sections) if self.sections else "все разделы"
            send_log(f"Запуск роя конвертации ({label}{', с переделкой готовых' if self.force else ''})...")
            self.swarm = ConversionSwarm(self.config, log=send_log)
            self.swarm.run(
                discover_tasks(self.config, self.sections),
                force=self.force,
                stop_event=self._stop_event,
                on_progress=self._set_progress,
            )
        except Exception as e:
            logger.exception("Конвертация упала")
            self.last_error = str(e)
            send_log(f"Аварийное завершение: {e}", "ERROR")
        finally:
            self.finished_at = _now()

    def status(self) -> dict:
        stats = section_stats(self.config)
        sections = [
            {
                "id": section,
                "name": section.replace("_", " "),
                "total": sum(counts.values()),
                "success": counts.get("success", 0),
                "partial": counts.get("partial", 0),
                "failed": counts.get("failed", 0),
                "pending": counts.get("pending", 0),
            }
            for section, counts in sorted(stats.items())
        ]
        return {
            "status": "ok",
            "running": self.is_running(),
            "stopping": self.is_running() and self._stop_event.is_set(),
            "requested_sections": self.sections,
            "force": self.force,
            "progress": self.progress,
            "started_at": self.started_at,
            "finished_at": self.finished_at,
            "last_error": self.last_error,
            "sections": sections,
            "swarm": self.swarm.status() if self.swarm else None,
        }


class StartRequest(BaseModel):
    sections: Optional[List[str]] = Field(default=None, description="Разделы; пусто / null = все")
    force: bool = Field(default=False, description="Переделать даже готовые файлы")


manager = ConversionManager(ConverterConfig())
app = FastAPI(title="Document Converter API")


@app.get("/")
def root():
    return {"message": "Конвертер документов (Docling) работает"}


@app.get("/api/converter/status")
def status_endpoint():
    return manager.status()


@app.post("/api/converter/start")
def start_endpoint(body: StartRequest = StartRequest()):
    sections = body.sections or None
    if not manager.start(sections, body.force):
        return {"status": "busy", "message": "Конвертация уже выполняется"}
    label = ", ".join(s.replace("_", " ") for s in sections) if sections else "всех разделов"
    return {"status": "accepted", "message": f"Конвертация запущена для: {label}"}


@app.post("/api/converter/stop")
def stop_endpoint():
    if not manager.stop():
        return {"status": "idle", "message": "Конвертация сейчас не выполняется"}
    return {"status": "accepted", "message": "Остановка конвертации запрошена"}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    uvicorn.run(
        app,
        host=os.getenv("CONVERTER_HOST", "127.0.0.1"),
        port=int(os.getenv("CONVERTER_PORT", "8004")),
        reload=False,
    )
