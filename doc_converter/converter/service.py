import logging
import threading
import time
from datetime import datetime, timezone
from typing import Callable, Iterable, Optional

from converter.engine import DoclingEngine, EngineResult
from converter.tasks import ConversionTask, file_sha256
from converter.writer import write_result

logger = logging.getLogger(__name__)


def _now():
    return datetime.now(timezone.utc).isoformat()


class ConversionService:
    """Прогоняет список задач через один движок. Агент роя = процесс с таким сервисом."""

    def __init__(self, engine: DoclingEngine, log: Optional[Callable[[str, str], None]] = None):
        self.engine = engine
        self._log_cb = log

    def _log(self, message: str, level: str = "INFO"):
        logger.log(logging.ERROR if level == "ERROR" else logging.INFO, message)
        if self._log_cb:
            self._log_cb(message, level)

    def convert_task(self, task: ConversionTask, force: bool = False) -> str:
        """Возвращает итог: success | partial | failed | skipped."""
        sha256 = file_sha256(task.source)
        if not force and task.is_done(sha256):
            return "skipped"

        started_at = _now()
        started = time.monotonic()
        try:
            result = self.engine.convert(task.source)
        except Exception as e:
            logger.exception(f"Docling упал на {task.source.name}")
            result = EngineResult(status="failed", errors=[f"{type(e).__name__}: {e}"])

        meta = {
            "material_id": task.material_id,
            "section": task.section,
            "source": {
                "file": task.source.name,
                "format": task.source.suffix.lower().lstrip("."),
                "size": task.source.stat().st_size,
                "sha256": sha256,
            },
            "converter": {"name": self.engine.name, "version": self.engine.version},
            "started_at": started_at,
            "finished_at": _now(),
            "duration_sec": round(time.monotonic() - started, 2),
        }
        write_result(task, result, meta)
        return result.status

    def run(self, tasks: Iterable[ConversionTask], force: bool = False,
            limit: Optional[int] = None, stop_event: Optional[threading.Event] = None,
            on_progress: Optional[Callable[[dict], None]] = None) -> dict:
        tasks = list(tasks)
        summary = {"total": len(tasks), "done": 0, "success": 0, "partial": 0, "failed": 0,
                   "skipped": 0, "stopped": False, "current": None}
        converted = 0
        self._log(f"Найдено файлов для конвертации: {len(tasks)}")

        def report():
            if on_progress:
                on_progress(dict(summary))

        for index, task in enumerate(tasks, start=1):
            if stop_event and stop_event.is_set():
                summary["stopped"] = True
                break
            if limit is not None and converted >= limit:
                break

            summary["current"] = f"{task.section}/{task.source.name}"
            report()
            status = self.convert_task(task, force=force)
            summary[status] += 1
            summary["done"] = index
            summary["current"] = None
            report()
            if status == "skipped":
                continue

            converted += 1
            meta = task.read_meta() or {}
            line = (f"[{index}/{len(tasks)}] {task.section}/{task.source.name}: {status}, "
                    f"страниц {meta.get('stats', {}).get('pages', 0)}, {meta.get('duration_sec', 0)} с")
            if status == "failed":
                line += f" — {'; '.join(meta.get('errors') or [])[:300]}"
            self._log(line, "ERROR" if status == "failed" else "INFO")

        self._log(
            f"Конвертация завершена: успешно {summary['success']}, частично {summary['partial']}, "
            f"ошибок {summary['failed']}, уже были готовы {summary['skipped']}"
            + (" (остановлено пользователем)" if summary["stopped"] else ""),
            "WARNING" if summary["stopped"] else "SUCCESS",
        )
        report()
        return summary
