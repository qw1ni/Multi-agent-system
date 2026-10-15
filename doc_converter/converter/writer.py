"""
Запись результатов конвертации.

<CONVERTED_DIR>/<раздел>/<имя файла>/
    document.md    — Markdown для чтения человеком и простых LLM-промптов
    document.json  — DoclingDocument без потерь (структура, таблицы, страницы, координаты);
                     из него позже режутся чанки для LLM (docling HybridChunker)
    meta.json      — что, из чего, чем и с каким результатом сконвертировано

Пишем во временную папку и переименовываем целиком, чтобы прерванный агент
не оставил полурезультат.
"""

import json
import os
import shutil
from pathlib import Path

from converter.engine import EngineResult
from converter.tasks import META_FILE, ConversionTask

MARKDOWN_FILE = "document.md"
JSON_FILE = "document.json"
META_SCHEMA_VERSION = 1


def _replace_dir(tmp_dir: Path, target: Path):
    if target.exists():
        shutil.rmtree(target)
    os.replace(tmp_dir, target)


def write_result(task: ConversionTask, result: EngineResult, meta: dict) -> dict:
    task.output_dir.parent.mkdir(parents=True, exist_ok=True)
    tmp_dir = task.output_dir.with_name(f".{task.output_dir.name}.tmp-{os.getpid()}")
    if tmp_dir.exists():
        shutil.rmtree(tmp_dir)
    tmp_dir.mkdir()

    try:
        outputs = {}
        if result.document is not None:
            markdown = result.document.export_to_markdown()
            (tmp_dir / MARKDOWN_FILE).write_text(markdown, encoding="utf-8")
            with open(tmp_dir / JSON_FILE, "w", encoding="utf-8") as f:
                json.dump(result.document.export_to_dict(), f, ensure_ascii=False)
            outputs = {"markdown": MARKDOWN_FILE, "json": JSON_FILE}
            meta["stats"] = {"pages": result.pages, "markdown_chars": len(markdown)}

        meta.update({
            "schema_version": META_SCHEMA_VERSION,
            "status": result.status,
            "errors": result.errors,
            "outputs": outputs,
        })
        with open(tmp_dir / META_FILE, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)

        _replace_dir(tmp_dir, task.output_dir)
        return meta
    except BaseException:
        shutil.rmtree(tmp_dir, ignore_errors=True)
        raise
