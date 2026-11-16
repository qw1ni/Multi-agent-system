import logging
from typing import List, Optional, Sequence, Tuple

logger = logging.getLogger(__name__)


class ChunkRepository:
    def __init__(self, db):
        self.db = db

    def existing_material_ids(self) -> set:
        rows = self.db.execute_query("SELECT id FROM materials;", fetch=True) or []
        return {row[0] for row in rows}

    def count(self, section: Optional[str] = None) -> int:
        if section:
            result = self.db.execute_query(
                "SELECT COUNT(*) FROM chunk_embeddings WHERE section = %s;",
                (section,),
                fetch=True,
            )
        else:
            result = self.db.execute_query("SELECT COUNT(*) FROM chunk_embeddings;", fetch=True)
        return result[0][0] if result else 0

    def delete_by_doc_id(self, doc_id: str):
        self.db.execute_query("DELETE FROM chunk_embeddings WHERE doc_id = %s;", (doc_id,))

    def list_documents(self, exclude_section: Optional[str] = "playground") -> List[dict]:
        filters = []
        params: list = []
        if exclude_section:
            filters.append("COALESCE(section, '') <> %s")
            params.append(exclude_section)
        where = f"WHERE {' AND '.join(filters)}" if filters else ""
        rows = self.db.execute_query(
            f"""
            SELECT
                source_file,
                doc_id,
                section,
                document_type,
                COUNT(*)::int AS chunks,
                MIN(material_id) AS material_id
            FROM chunk_embeddings
            {where}
            GROUP BY source_file, doc_id, section, document_type
            ORDER BY source_file NULLS LAST, doc_id;
            """,
            tuple(params) if params else None,
            fetch=True,
        ) or []
        return [
            {
                "source_file": row[0],
                "doc_id": row[1],
                "section": row[2],
                "document_type": row[3],
                "chunks": row[4],
                "material_id": row[5],
            }
            for row in rows
        ]

    def upsert_batch(self, rows: List[tuple]):
        query = """
            INSERT INTO chunk_embeddings (
                chunk_id, material_id, doc_id, section, source_file, chunk_index,
                headings, pages, role, document_type, important, text, embedding
            )
            VALUES %s
            ON CONFLICT (chunk_id) DO UPDATE SET
                material_id = EXCLUDED.material_id,
                doc_id = EXCLUDED.doc_id,
                section = EXCLUDED.section,
                source_file = EXCLUDED.source_file,
                chunk_index = EXCLUDED.chunk_index,
                headings = EXCLUDED.headings,
                pages = EXCLUDED.pages,
                role = EXCLUDED.role,
                document_type = EXCLUDED.document_type,
                important = EXCLUDED.important,
                text = EXCLUDED.text,
                embedding = EXCLUDED.embedding,
                indexed_at = NOW();
        """
        self.db.execute_batch(query, rows)

    def find_similar(
        self,
        vector_str: str,
        threshold: float,
        limit: int,
        material_id: Optional[int] = None,
        document_type: Optional[str] = None,
        role: Optional[str] = None,
        section: Optional[str] = None,
        important_only: bool = False,
        source_file: Optional[str] = None,
        exclude_section: Optional[str] = None,
        doc_id: Optional[str] = None,
    ) -> Sequence[Tuple]:
        filters = ["similarity >= %s"]
        params: list = [vector_str, threshold]
        if material_id is not None:
            filters.append("material_id = %s")
            params.append(material_id)
        if document_type:
            filters.append("document_type = %s")
            params.append(document_type)
        if role:
            filters.append("role = %s")
            params.append(role)
        if section:
            filters.append("section = %s")
            params.append(section)
        if exclude_section:
            filters.append("COALESCE(section, '') <> %s")
            params.append(exclude_section)
        if important_only:
            filters.append("important = TRUE")
        if source_file:
            filters.append("source_file = %s")
            params.append(source_file)
        if doc_id:
            filters.append("doc_id = %s")
            params.append(doc_id)
        params.append(limit)
        where = " AND ".join(filters)
        query = f"""
            SELECT * FROM (
                SELECT
                    chunk_id,
                    material_id,
                    doc_id,
                    section,
                    source_file,
                    chunk_index,
                    headings,
                    pages,
                    role,
                    document_type,
                    important,
                    text,
                    (1 - (embedding <=> %s::vector)) AS similarity
                FROM chunk_embeddings
            ) AS ranked
            WHERE {where}
            ORDER BY similarity DESC
            LIMIT %s;
        """
        return self.db.execute_query(query, tuple(params), fetch=True) or []
