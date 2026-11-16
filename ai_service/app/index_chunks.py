"""Индексация chunks.jsonl в chunk_embeddings. LLM не вызывается.

    cd ai_service && python -m app.index_chunks
"""
import logging
import os
from pathlib import Path

from dotenv import load_dotenv

from app.providers.database import DatabaseManager
from app.providers.model_loader import ModelLoader
from app.repositories.chunk_repository import ChunkRepository
from app.services.chunk_index_service import ChunkIndexService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
load_dotenv()


def main():
    converted = Path(os.getenv(
        "CONVERTED_DIR",
        str(Path(__file__).resolve().parents[2] / "doc_converter" / "data" / "converted"),
    ))
    service = ChunkIndexService(
        ChunkRepository(DatabaseManager()),
        ModelLoader.get_model(),
        converted,
    )
    stats = service.index_all()
    print(stats)


if __name__ == "__main__":
    main()
