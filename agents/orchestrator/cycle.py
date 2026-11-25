"""Отдельный режим оркестратора: порция с сайта, потом конвертация, по кругу.

Обычный парсинг и обычная конвертация этот класс не вызывают.
"""
from __future__ import annotations

import logging
import os
import subprocess
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[2]
CONVERTER_DIR = ROOT / "doc_converter"
DEFAULT_BATCH = 30


def _now():
    return datetime.now(timezone.utc).isoformat()


class PipelineCycle:
    def __init__(self, parser):
        self.parser = parser
        self._thread = None
        self._stop = threading.Event()
        self.batch = DEFAULT_BATCH
        self.round = 0
        self.phase = "idle"
        self.started_at = None
        self.last_message = ""
        self.last_error = None

    def running(self) -> bool:
        return self._thread is not None and self._thread.is_alive()

    def start(self, batch: int = DEFAULT_BATCH) -> dict:
        if self.running():
            return {
                "ok": False,
                "message": f"Конвейер уже идёт, порция {self.batch}. Остановка: СТОП КОНВЕЙЕР",
                "data": self.snapshot(),
            }
        self.batch = max(1, min(int(batch or DEFAULT_BATCH), 500))
        self._stop.clear()
        self.round = 0
        self.phase = "starting"
        self.started_at = _now()
        self.last_error = None
        self.last_message = f"Конвейер запущен, порция {self.batch}"
        self._thread = threading.Thread(target=self._loop, name="pipeline-cycle", daemon=True)
        self._thread.start()
        return {"ok": True, "message": self.last_message, "data": self.snapshot()}

    def stop(self) -> dict:
        if not self.running():
            self.phase = "idle"
            return {"ok": True, "message": "Конвейер не запущен", "data": self.snapshot()}
        self._stop.set()
        self.phase = "stopping"
        self.last_message = "Останавливаю конвейер после текущего шага"
        try:
            self.parser.stop_parsing()
        except Exception:
            logger.exception("не удалось остановить парсер")
        return {"ok": True, "message": self.last_message, "data": self.snapshot()}

    def snapshot(self) -> dict:
        return {
            "running": self.running(),
            "batch": self.batch,
            "round": self.round,
            "phase": self.phase,
            "started_at": self.started_at,
            "last_message": self.last_message,
            "last_error": self.last_error,
        }

    def _loop(self):
        pause = max(5, int(os.getenv("CYCLE_PAUSE", "30")))
        while not self._stop.is_set():
            self.round += 1
            try:
                self._round()
            except Exception as exc:
                logger.exception("конвейер")
                self.last_error = str(exc)
                self.last_message = f"Круг {self.round} упал: {exc}"
            if self._stop.is_set():
                break
            self.phase = "pause"
            self.last_message = f"Круг {self.round} закончен, пауза {pause} с"
            self._stop.wait(pause)
        self.phase = "idle"
        self.last_message = "Конвейер остановлен"

    def _round(self):
        self.phase = "parse"
        self.last_message = f"Круг {self.round}: парсинг новых, не больше {self.batch}"
        started = self.parser.start_parsing(mode="incremental", limit=self.batch)
        if not started.ok:
            self.last_message = started.message
        self._wait_parser(parsing=True)
        if self._stop.is_set():
            return

        self.phase = "download"
        self.last_message = f"Круг {self.round}: скачивание не больше {self.batch} новых файлов"
        downloaded = self.parser.download_files(limit=self.batch)
        if not downloaded.ok:
            self.last_message = downloaded.message
        self._wait_parser(parsing=False)
        if self._stop.is_set():
            return

        self.phase = "convert"
        self.last_message = f"Круг {self.round}: конвертация не больше {self.batch} файлов"
        self._convert()

    def _wait_parser(self, parsing: bool):
        """Ждёт, пока парсинг или скачивание закончатся."""
        time.sleep(2)
        idle_need = 0
        while not self._stop.is_set():
            status = self.parser.status()
            data = status.data or {}
            busy = bool(data.get("parsing")) if parsing else bool(data.get("downloading"))
            if not status.ok:
                busy = True
            if busy:
                idle_need = 0
            else:
                idle_need += 1
                if idle_need >= 2:
                    return
            self._stop.wait(5)

    def _convert(self):
        python = CONVERTER_DIR / ".venv" / "bin" / "python"
        if not python.is_file():
            self.last_error = f"нет {python}"
            self.last_message = "Конвертер не установлен, круг без конвертации"
            return
        env = os.environ.copy()
        env["CONVERTER_SWARM_AGENTS"] = "1"
        proc = subprocess.run(
            [str(python), "-m", "converter", "run", "--limit", str(self.batch), "--agents", "1"],
            cwd=str(CONVERTER_DIR),
            env=env,
            capture_output=True,
            text=True,
        )
        tail = (proc.stdout or proc.stderr or "").strip().splitlines()
        self.last_message = tail[-1] if tail else f"конвертация, код {proc.returncode}"
        if proc.returncode != 0:
            self.last_error = self.last_message
