import logging
from app.repositories.material_repository import MaterialRepository
from sentence_transformers import SentenceTransformer


class SearchService:
    def __init__(self, repo: MaterialRepository, model: SentenceTransformer):
        self.repo = repo
        self.model = model

    def find_similar_materials(self, query_text: str, limit: int = 5):
        query_vector = self.model.encode(query_text).tolist()
        return self.repo.find_by_vector(str(query_vector), 0.65, limit)
