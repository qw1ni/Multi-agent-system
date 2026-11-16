import logging
from typing import Optional

from sentence_transformers import SentenceTransformer

from app.repositories.chunk_repository import ChunkRepository

logger = logging.getLogger(__name__)


class RagService:
    def __init__(self, repo: ChunkRepository, model: SentenceTransformer):
        self.repo = repo
        self.model = model

    def query(
        self,
        query_text: str,
        limit: int = 8,
        threshold: float = 0.35,
        material_id: Optional[int] = None,
        document_type: Optional[str] = None,
        role: Optional[str] = None,
        section: Optional[str] = None,
        important_only: bool = False,
        source_file: Optional[str] = None,
        exclude_section: Optional[str] = None,
        doc_id: Optional[str] = None,
    ) -> list:
        vector = self.model.encode(query_text).tolist()
        rows = self.repo.find_similar(
            str(vector),
            threshold,
            limit,
            material_id=material_id,
            document_type=document_type,
            role=role,
            section=section,
            important_only=important_only,
            source_file=source_file,
            exclude_section=exclude_section,
            doc_id=doc_id,
        )
        results = []
        for row in rows:
            pages = row[7] or []
            results.append({
                "chunk_id": row[0],
                "material_id": row[1],
                "doc_id": row[2],
                "section": row[3],
                "source_file": row[4],
                "chunk_index": row[5],
                "headings": row[6],
                "pages": list(pages) if pages is not None else [],
                "role": row[8],
                "document_type": row[9],
                "important": bool(row[10]),
                "text": row[11],
                "similarity": round(float(row[12]), 4),
            })
        return results
