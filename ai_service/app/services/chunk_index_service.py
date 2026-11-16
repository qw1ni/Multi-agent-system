import json
import logging
import os
from pathlib import Path
from typing import Iterator

from sentence_transformers import SentenceTransformer

from app.repositories.chunk_repository import ChunkRepository

logger = logging.getLogger(__name__)

MIN_TOKENS = 8


def iter_converted_chunks(converted_dir: Path) -> Iterator[dict]:
    if not converted_dir.is_dir():
        raise FileNotFoundError(f"Нет каталога конвертации: {converted_dir}")
    for path in sorted(converted_dir.rglob("chunks.jsonl")):
        with open(path, encoding="utf-8") as handle:
            for line in handle:
                line = line.strip()
                if line:
                    yield json.loads(line)


def _pg_int_array(values) -> str:
    if not values:
        return "{}"
    return "{" + ",".join(str(int(v)) for v in values) + "}"


class ChunkIndexService:
    def __init__(self, repo: ChunkRepository, model: SentenceTransformer, converted_dir: Path):
        self.repo = repo
        self.model = model
        self.converted_dir = converted_dir
        self.batch_size = int(os.getenv("RAG_INDEX_BATCH", "32"))

    def index_all(self) -> dict:
        known_ids = self.repo.existing_material_ids()
        pending = []
        skipped = 0
        indexed = 0

        def flush():
            nonlocal pending, indexed
            if not pending:
                return
            texts = [item["text_for_embedding"] for item in pending]
            vectors = self.model.encode(texts, show_progress_bar=False)
            rows = []
            for item, vector in zip(pending, vectors):
                mid = item.get("material_id")
                if mid is not None and mid not in known_ids:
                    mid = None
                headings = item.get("headings") or []
                rows.append((
                    item["id"],
                    mid,
                    item.get("doc_id") or "",
                    item.get("section"),
                    item.get("source_file"),
                    item.get("chunk_index"),
                    "\n".join(str(h) for h in headings) if headings else None,
                    _pg_int_array(item.get("pages") or []),
                    item.get("role"),
                    item.get("document_type"),
                    bool(item.get("important")),
                    item.get("text") or "",
                    str(vector.tolist()),
                ))
            self.repo.upsert_batch(rows)
            indexed += len(rows)
            pending = []
            logger.info("Проиндексировано чанков: %s", indexed)

        for chunk in iter_converted_chunks(self.converted_dir):
            tokens = int(chunk.get("tokens") or 0)
            text = (chunk.get("text_for_embedding") or chunk.get("text") or "").strip()
            if tokens < MIN_TOKENS or len(text) < 12:
                skipped += 1
                continue
            chunk["text_for_embedding"] = text
            pending.append(chunk)
            if len(pending) >= self.batch_size:
                flush()
        flush()
        return {"indexed": indexed, "skipped": skipped, "total_in_db": self.repo.count()}
