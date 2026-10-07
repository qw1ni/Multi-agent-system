import logging
from typing import List, Tuple, Optional

logger = logging.getLogger(__name__)


class MaterialRepository:
    def __init__(self, db):
        self.db = db

    def get_total_materials_count(self) -> int:
        query = "SELECT COUNT(*) FROM materials;"
        result = self.db.execute_query(query, fetch=True)
        return result[0][0] if result else 0

    def get_materials_batch(self, limit: int, offset: int) -> List[Tuple]:
        query = f"""
            SELECT 
                m.id, 
                m.title, 
                COALESCE((
                    SELECT STRING_AGG(
                        REGEXP_REPLACE(s.spec_name, '^[0-9\s-]+', '', 'g'), 
                        ' '
                    ) 
                    FROM material_specialties ms 
                    JOIN specialties s ON ms.spec_code = s.spec_code 
                    WHERE ms.material_id = m.id
                ), '') as specs
            FROM materials m
            ORDER BY m.id
            LIMIT %s OFFSET %s;
        """
        return self.db.execute_query(query, (limit, offset), fetch=True)

    def upsert_embeddings_batch(self, data: List[Tuple[int, List[float]]]):
        query = """
            INSERT INTO material_embeddings (material_id, text_embedding)
            VALUES %s
            ON CONFLICT (material_id) 
            DO UPDATE SET text_embedding = EXCLUDED.text_embedding;
        """
        self.db.execute_batch(query, data)

    def find_by_vector(self, vector_str: str, threshold: float, limit: int) -> List[Tuple[int, float]]:
        query = """
            SELECT * FROM (
                SELECT 
                    material_id, 
                    (1 - (text_embedding <=> %s::vector)) as similarity
                FROM material_embeddings
            ) AS subquery
            WHERE similarity >= %s
            ORDER BY similarity DESC
            LIMIT %s;
        """
        return self.db.execute_query(query, (vector_str, threshold, limit), fetch=True)

    def find_similar_to_id(self, material_id: int, limit: int) -> List[Tuple[int, float]]:
        query = """
            SELECT 
                material_id, 
                1 - (text_embedding <=> (
                    SELECT text_embedding FROM material_embeddings WHERE material_id = %s
                )) AS similarity
            FROM material_embeddings
            WHERE material_id != %s
            ORDER BY similarity DESC
            LIMIT %s;
        """
        return self.db.execute_query(query, (material_id, material_id, limit), fetch=True)