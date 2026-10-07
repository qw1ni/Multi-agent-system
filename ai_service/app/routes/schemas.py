from pydantic import BaseModel, Field
from typing import List


class ReindexResponse(BaseModel):
    status: str = Field(..., example="accepted")
    message: str = Field(..., example="Процесс обновления векторов запущен")


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=3, description="Текст поискового запроса")
    limit: int = Field(5, ge=1, le=50, description="Количество результатов")


class SearchResult(BaseModel):
    material_id: int
    similarity: float


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]


class SimilarityRequest(BaseModel):
    material_id: int = Field(..., ge=1, description="ID исходного материала")
    limit: int = Field(5, ge=1, le=50, description="Количество похожих материалов")
