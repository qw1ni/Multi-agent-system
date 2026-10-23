"""
Запись результатов конвертации.

<CONVERTED_DIR>/<раздел>/<имя файла>/
    document.md    — очищенный Markdown для чтения человеком и длинного контекста LLM
    document.json  — DoclingDocument без потерь (структура, таблицы, страницы, координаты);
                     из него можно пересобрать чанки без повторного распознавания
    chunks.jsonl   — чанки для RAG / эмбеддингов, по одному JSON на строку (см. converter.llm)
    meta.json      — что, из чего, чем и с каким результатом сконвертировано + quality

Пишем во временную папку и переименовываем целиком, чтобы прерванный агент
не оставил полурезультат.
"""

import json
import os
import shutil
from pathlib import Path
from typing import Optional

from converter.engine import EngineResult
from converter.llm import LlmPayload
from converter.tasks import (
    CHUNKS_FILE,
    JSON_FILE,
    MARKDOWN_FILE,
    META_FILE,
    META_SCHEMA_VERSION,
    ConversionTask,
)


def _replace_dir(tmp_dir: Path, target: Path):
    if target.exists():
        shutil.rmtree(target)
    os.replace(tmp_dir, target)


def write_result(task: ConversionTask, result: EngineResult, meta: dict,
                 payload: Optional[LlmPayload] = None) -> dict:
    task.output_dir.parent.mkdir(parents=True, exist_ok=True)
    tmp_dir = task.output_dir.with_name(f".{task.output_dir.name}.tmp-{os.getpid()}")
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)
    tmp_dir.mkdir()

    try:
        outputs = {}
        warnings = []
        if result.document is not None and payload is not None:
            (tmp_dir / MARKDOWN_FILE).write_text(payload.markdown, encoding="utf-8")
            with open(tmp_dir / JSON_FILE, "w", encoding="utf-8") as f:
                json.dump(result.document.export_to_dict(), f, ensure_ascii=False)
            with open(tmp_dir / CHUNKS_FILE, "w", encoding="utf-8") as f:
                for chunk in payload.chunks:
                    f.write(json.dumps(chunk, ensure_ascii=False) + "\n")
            outputs = {"markdown": MARKDOWN_FILE, "json": JSON_FILE, "chunks": CHUNKS_FILE}
            meta["stats"] = payload.stats
            meta["quality"] = payload.quality
            warnings = payload.warnings

        meta.update({
            "schema_version": META_SCHEMA_VERSION,
            "status": result.status,
            "errors": result.errors,
            "warnings": warnings,
            "outputs": outputs,
        })
        with open(tmp_dir / META_FILE, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)

        _replace_dir(tmp_dir, task.output_dir)
        return meta
    except BaseException:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise
