"""
Агент-исполнитель роя конвертации: отдельный процесс, который конвертирует свой
раздел (или часть большого раздела) и шлёт оркестратору события через очередь.

Процесс, а не поток: DocumentConverter не рассчитан на несколько потоков, а падение
Docling или нехватка памяти на одном файле не должны ронять весь рой.
"""

import logging
import os
from typing import List

from converter.config import ConverterConfig
from converter.engine import DoclingEngine
from converter.llm import LlmPreparer
from converter.service import ConversionService
from converter.tasks import ConversionTask


def run_agent(agent_id: int, config: ConverterConfig, tasks: List[ConversionTask], force: bool,
              events, stop_event):
    logging.basicConfig(level=logging.INFO,
                        format=f"%(asctime)s [%(levelname)s] агент-{agent_id}: %(message)s")
    # Каждый агент сам проверяет модели на Hugging Face — без этого лог тонет в HTTP-запросах
    for noisy in ("httpx", "huggingface_hub"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    def emit(kind: str, **data):
        events.put({"agent": agent_id, "type": kind, **data})

    try:
        emit("started", pid=os.getpid())
        service = ConversionService(DoclingEngine(config), LlmPreparer(config))
        for task in tasks:
            if stop_event.is_set():
                emit("finished", state="stopped")
                return
            emit("file_started", source=str(task.source))
            status = service.convert_task(task, force=force)
            meta = (task.read_meta() or {}) if status != "skipped" else {}
            emit(
                "file_done",
                source=str(task.source),
                status=status,
                pages=meta.get("stats", {}).get("pages", 0),
                chunks=meta.get("stats", {}).get("chunks", 0),
                duration=meta.get("duration_sec", 0),
                errors=meta.get("errors") or [],
                warnings=meta.get("warnings") or [],
                reused=bool(meta.get("document_reused")),
            )
        emit("finished", state="done")
    except Exception as e:
        logging.getLogger(__name__).exception("Агент упал")
        emit("error", error=f"{type(e).__name__}: {e}")
        raise SystemExit(1)
