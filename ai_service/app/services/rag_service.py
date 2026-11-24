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

    def answer(self, query_text: str, **kwargs) -> dict:
        from app.providers.cloud_llm import chat_text, configured, provider

        hits = self.query(query_text, **kwargs)
        if not hits:
            return {"query": query_text, "answer": None, "provider": provider(), "results": []}
        if not configured():
            return {
                "query": query_text,
                "answer": None,
                "provider": None,
                "results": hits,
                "warning": "Нет API-ключа облачной модели",
            }
        blocks = []
        for i, hit in enumerate(hits, 1):
            pages = ", ".join(str(p) for p in (hit.get("pages") or [])) or "—"
            blocks.append(
                f"[{i}] файл: {hit.get('source_file') or hit.get('doc_id')}; "
                f"с. {pages}; сходство {hit['similarity']}\n{hit['text']}"
            )
        messages = [
            {
                "role": "system",
                "content": (
                    "Ты помощник по учебно-методическим материалам университета. "
                    "Отвечай только по приведённым фрагментам. Если в них нет ответа — скажи об этом. "
                    "В конце укажи источники в виде имени файла и страниц. Пиши по-русски, кратко."
                ),
            },
            {
                "role": "user",
                "content": f"Вопрос: {query_text}\n\nФрагменты:\n\n" + "\n\n".join(blocks),
            },
        ]
        try:
            text = chat_text(messages)
        except Exception as exc:
            from app.providers.cloud_llm import redact

            logger.error("Языковая модель: %s", redact(str(exc)))
            return {
                "query": query_text,
                "answer": None,
                "provider": provider(),
                "results": hits,
                "warning": redact(str(exc)),
            }
        return {"query": query_text, "answer": text, "provider": provider(), "results": hits}
