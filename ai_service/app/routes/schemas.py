from pydantic import BaseModel, Field
from typing import List, Optional


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


class RagQueryRequest(BaseModel):
    query: str = Field(..., min_length=3, description="Вопрос или фрагмент для поиска по чанкам")
    limit: int = Field(8, ge=1, le=30)
    threshold: float = Field(0.35, ge=0.0, le=1.0)
    material_id: Optional[int] = Field(None, ge=1)
    document_type: Optional[str] = Field(None, description="mu | rp | fos")
    role: Optional[str] = Field(None, description="lab | lecture | practice | exam | ...")
    section: Optional[str] = None
    source_file: Optional[str] = None
    doc_id: Optional[str] = None
    exclude_section: Optional[str] = None
    important_only: bool = False


class RagHit(BaseModel):
    chunk_id: str
    material_id: Optional[int]
    doc_id: str
    section: Optional[str]
    source_file: Optional[str]
    chunk_index: Optional[int]
    headings: Optional[str]
    pages: List[int]
    role: Optional[str]
    document_type: Optional[str]
    important: bool
    text: str
    similarity: float


class RagQueryResponse(BaseModel):
    query: str
    results: List[RagHit]


class RagIndexResponse(BaseModel):
    status: str
    message: str


class RagIngestRequest(BaseModel):
    filename: str = Field(..., min_length=1)
    content_base64: str = Field(..., min_length=8)


class RagIngestResponse(BaseModel):
    filename: str
    doc_id: str
    chars: int
    chunks: int
    section: str


class RagStatsResponse(BaseModel):
    total_chunks: int
    playground_chunks: int
    document_count: int = 0


class RagDocumentItem(BaseModel):
    source_file: Optional[str] = None
    doc_id: str
    section: Optional[str] = None
    document_type: Optional[str] = None
    chunks: int
    material_id: Optional[int] = None


class RagDocumentsResponse(BaseModel):
    documents: List[RagDocumentItem]
