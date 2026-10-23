"""
Манифесты корпуса — точка входа для LLM-пайплайна (индексация, RAG, дообучение):

  <CONVERTED_DIR>/manifest.jsonl            — все документы
  <CONVERTED_DIR>/<раздел>/manifest.jsonl   — документы раздела

Строка = документ: material_id (связь с БД), статус, llm_ready, страницы, чанки,
флаги качества и пути к файлам относительно CONVERTED_DIR.
Пересобираются оркестратором после каждого прогона, читают только meta.json.
"""

import json
import os
from collections import defaultdict
from pathlib import Path
from typing import Iterable, Iterator, List, Optional

from converter.config import ConverterConfig
from converter.tasks import discover_tasks

MANIFEST_FILE = "manifest.jsonl"


def _entry(task, meta: dict, root: Path) -> dict:
    quality = meta.get("quality") or {}
    stats = meta.get("stats") or {}
    folder = task.output_dir.relative_to(root).as_posix()
    return {
        "doc_id": task.doc_id,
        "material_id": task.material_id,
        "section": task.section,
        "source_file": task.source.name,
        "source_sha256": meta.get("source", {}).get("sha256"),
        "status": meta.get("status"),
        "llm_ready": bool(meta.get("status") in ("success", "partial") and quality.get("llm_ready")),
        "flags": quality.get("flags", []),
        "pages": stats.get("pages", 0),
        "chunks": stats.get("chunks", 0),
        "tokens": stats.get("tokens", 0),
        "schema_version": meta.get("schema_version", 1),
        "converted_at": meta.get("finished_at"),
        "paths": {kind: f"{folder}/{name}" for kind, name in (meta.get("outputs") or {}).items()},
    }


def _write_jsonl(path: Path, rows: List[dict]):
    tmp = path.with_name(f".{path.name}.tmp-{os.getpid()}")
    with open(tmp, "w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    os.replace(tmp, path)


def build_manifests(config: ConverterConfig) -> dict:
    root = config.converted_dir
    per_section = defaultdict(list)
    for task in discover_tasks(config):
        meta = task.read_meta()
        if meta:
            per_section[task.section].append(_entry(task, meta, root))
    if not per_section:
        return {"documents": 0, "llm_ready": 0, "chunks": 0}

    everything = []
    for section, rows in sorted(per_section.items()):
        _write_jsonl(root / section / MANIFEST_FILE, rows)
        everything.extend(rows)
    _write_jsonl(root / MANIFEST_FILE, everything)

    ready = [row for row in everything if row["llm_ready"]]
    return {"documents": len(everything), "llm_ready": len(ready), "chunks": sum(r["chunks"] for r in ready)}


def iter_chunks(config: ConverterConfig, sections: Optional[Iterable[str]] = None) -> Iterator[dict]:
    """Все чанки готовых для LLM документов — для индексации в векторную БД."""
    wanted = {s.strip().replace(" ", "_") for s in sections} if sections else None
    root = config.converted_dir
    with open(root / MANIFEST_FILE, encoding="utf-8") as manifest:
        for line in manifest:
            doc = json.loads(line)
            if not doc["llm_ready"] or (wanted and doc["section"] not in wanted):
                continue
            with open(root / doc["paths"]["chunks"], encoding="utf-8") as chunks:
                for chunk_line in chunks:
                    yield json.loads(chunk_line)
