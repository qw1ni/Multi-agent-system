import logging
import time
from datetime import datetime, timezone

from converter.engine import DoclingEngine, EngineResult
from converter.llm import LlmPreparer
from converter.tasks import JSON_FILE, ConversionTask, file_sha256
from converter.writer import write_result

logger = logging.getLogger(__name__)


def _now():
    return datetime.now(timezone.utc).isoformat()


def _base_meta(task: ConversionTask, sha256: str, engine: DoclingEngine) -> dict:
    return {
        "material_id": task.material_id,
        "doc_id": task.doc_id,
        "section": task.section,
        "source": {
            "file": task.source.name,
            "format": task.source.suffix.lower().lstrip("."),
            "size": task.source.stat().st_size,
            "sha256": sha256,
        },
        "converter": {"name": engine.name, "version": engine.version},
    }


def record_failure(task: ConversionTask, engine: DoclingEngine, reason: str):
    """Для файлов, на которых умер процесс агента: сам агент записать итог уже не может."""
    sha256 = file_sha256(task.source)
    if task.has_reusable_document(sha256):
        # Упала только пересборка чанков — распознанный документ дороже, оставляем его до следующего запуска
        return
    meta = _base_meta(task, sha256, engine)
    meta.update({"started_at": _now(), "finished_at": _now(), "duration_sec": 0})
    write_result(task, EngineResult(status="failed", errors=[reason]), meta)


class ConversionService:
    """Конвертирует файлы через один движок. Агент роя = процесс с таким сервисом."""

    def __init__(self, engine: DoclingEngine, preparer: LlmPreparer):
        self.engine = engine
        self.preparer = preparer

    def convert_task(self, task: ConversionTask, force: bool = False) -> str:
        """Возвращает итог: success | partial | failed | skipped."""
        sha256 = file_sha256(task.source)
        if not force and task.is_done(sha256):
            return "skipped"

        started_at = _now()
        started = time.monotonic()
        meta = _base_meta(task, sha256, self.engine)
        reuse = not force and task.has_reusable_document(sha256)
        try:
            if reuse:
                previous = task.read_meta() or {}
                result = self._load_previous(task, previous)
                meta["converter"] = previous.get("converter", meta["converter"])
                meta["document_reused"] = True
            else:
                result = self.engine.convert(task.source)
        except Exception as e:
            logger.exception(f"Docling упал на {task.source.name}")
            result = EngineResult(status="failed", errors=[f"{type(e).__name__}: {e}"])

        payload = None
        if result.document is not None:
            payload = self.preparer.prepare(task, result.document, sha256)

        meta.update({
            "started_at": started_at,
            "finished_at": _now(),
            "duration_sec": round(time.monotonic() - started, 2),
        })
        write_result(task, result, meta, payload)
        return result.status

    @staticmethod
    def _load_previous(task: ConversionTask, previous: dict) -> EngineResult:
        from docling_core.types.doc import DoclingDocument

        document = DoclingDocument.load_from_json(task.output_dir / JSON_FILE)
        return EngineResult(status=previous["status"], document=document,
                            pages=document.num_pages(), errors=previous.get("errors") or [])
