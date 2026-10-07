import logging
from app.repositories.material_repository import MaterialRepository


class SimilarityService:
    def __init__(self, repo: MaterialRepository):
        self.repo = repo

    def get_similar_materials(self, material_id: int, limit: int = 5):
        results = self.repo.find_similar_to_id(material_id, limit)
        return [{"material_id": r[0], "similarity": round(float(r[1]), 4)} for r in results]
