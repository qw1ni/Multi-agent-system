"""
Задачи конвертации. Одна задача = один исходный файл.

Задачи независимы и идемпотентны: их можно раздавать агентам роя
(например, по разделам) и безопасно перезапускать.
"""

import hashlib
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Optional

from converter.config import ConverterConfig

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".doc"}
MARKDOWN_FILE = "document.md"
JSON_FILE = "document.json"
CHUNKS_FILE = "chunks.jsonl"
META_FILE = "meta.json"
# 2 — появились chunks.jsonl и quality; результаты версии 1 доделываются из document.json
META_SCHEMA_VERSION = 2
MATERIAL_ID_RE = re.compile(r"^(\d+)_")


@dataclass
class ConversionTask:
    source: Path
    section: str
    output_dir: Path

    @property
    def material_id(self) -> Optional[int]:
        match = MATERIAL_ID_RE.match(self.source.name)
        return int(match.group(1)) if match else None

    @property
    def doc_id(self) -> str:
        return f"{self.section}/{self.source.stem}"

    @property
    def meta_path(self) -> Path:
        return self.output_dir / META_FILE

    def read_meta(self) -> Optional[dict]:
        try:
            return json.loads(self.meta_path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return None

    def _converted_from(self, source_sha256: str) -> Optional[dict]:
        meta = self.read_meta()
        if (meta and meta.get("status") in ("success", "partial")
                and meta.get("source", {}).get("sha256") == source_sha256):
            return meta
        return None

    def is_done(self, source_sha256: str) -> bool:
        meta = self._converted_from(source_sha256)
        return bool(meta and meta.get("schema_version", 1) >= META_SCHEMA_VERSION)

    def has_reusable_document(self, source_sha256: str) -> bool:
        """Docling уже распознал этот файл, устарел только слой для LLM — пересобираем без OCR."""
        return bool(self._converted_from(source_sha256) and (self.output_dir / JSON_FILE).is_file())


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def discover_tasks(config: ConverterConfig, sections: Optional[Iterable[str]] = None) -> List[ConversionTask]:
    """Все поддерживаемые файлы из DOWNLOAD_DIR/<раздел>/, отсортированные по разделу и имени."""
    # Папки разделов названы как «ОКРБ_011-2009», а пользователь пишет «ОКРБ 011-2009»
    wanted = {s.strip().replace(" ", "_") for s in sections} if sections else None
    tasks = []
    if not config.download_dir.is_dir():
        return tasks

    for section_dir in sorted(p for p in config.download_dir.iterdir() if p.is_dir()):
        section = section_dir.name
        if wanted and section not in wanted:
            continue
        for source in sorted(section_dir.iterdir()):
            if not source.is_file() or source.suffix.lower() not in SUPPORTED_EXTENSIONS:
                continue
            tasks.append(ConversionTask(
                source=source,
                section=section,
                output_dir=config.converted_dir / section / source.stem,
            ))
    return tasks


def section_stats(config: ConverterConfig, sections: Optional[Iterable[str]] = None) -> dict:
    """{раздел: Counter(pending / success / partial / failed)} по meta.json, без пересчёта хешей."""
    per_section = defaultdict(Counter)
    for task in discover_tasks(config, sections):
        meta = task.read_meta() if task.meta_path.exists() else None
        per_section[task.section][meta.get("status") if meta else "pending"] += 1
    return dict(per_section)
