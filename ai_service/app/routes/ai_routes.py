import os
from pathlib import Path
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
import logging
from typing import List
from app.providers.model_loader import ModelLoader
from app.services.reindex_service import ReindexService
from app.services.search_service import SearchService
from app.services.similarity_service import SimilarityService
from app.services.chunk_index_service import ChunkIndexService
from app.services.rag_service import RagService
from app.services.playground_ingest import PlaygroundIngestService, PLAYGROUND_SECTION
from app.repositories.material_repository import MaterialRepository
from app.repositories.chunk_repository import ChunkRepository
from app.providers.database import DatabaseManager
from app.routes.schemas import (
    SearchRequest,
    SearchResult,
    ReindexResponse,
    SimilarityRequest,
    RagQueryRequest,
    RagQueryResponse,
    RagAnswerResponse,
    RagHit,
    RagIndexResponse,
    RagIngestRequest,
    RagIngestResponse,
    RagStatsResponse,
    RagDocumentItem,
    RagDocumentsResponse,
)

router = APIRouter(prefix="/api/ai", tags=["AI Operations"])


def get_search_service():
    db = DatabaseManager()
    repo = MaterialRepository(db)
    model = ModelLoader.get_model()
    return SearchService(repo, model)


def get_reindex_service():
    db = DatabaseManager()
    repo = MaterialRepository(db)
    model = ModelLoader.get_model()
    return ReindexService(repo, model)


def get_similarity_service():
    db = DatabaseManager()
    repo = MaterialRepository(db)
    return SimilarityService(repo)


def get_rag_service():
    db = DatabaseManager()
    return RagService(ChunkRepository(db), ModelLoader.get_model())


def get_playground_ingest():
    return PlaygroundIngestService(ChunkRepository(DatabaseManager()), ModelLoader.get_model())


def get_chunk_index_service():
    converted = Path(os.getenv(
        "CONVERTED_DIR",
        str(Path(__file__).resolve().parents[3] / "doc_converter" / "data" / "converted"),
    ))
    return ChunkIndexService(
        ChunkRepository(DatabaseManager()),
        ModelLoader.get_model(),
        converted,
    )


@router.post("/reindex", response_model=ReindexResponse)
async def start_reindexing(
    background_tasks: BackgroundTasks,
    service: ReindexService = Depends(get_reindex_service)
):
    background_tasks.add_task(service.reindex_all_materials)
    return ReindexResponse(
        status="accepted",
        message="Процесс обновления векторов запущен"
    )


@router.post("/search", response_model=List[SearchResult])
async def semantic_search(
    request: SearchRequest,
    service: SearchService = Depends(get_search_service)
):
    try:
        results = service.find_similar_materials(request.query, request.limit)
        return [
            SearchResult(material_id=row[0], similarity=round(row[1], 4))
            for row in results
        ]
    except Exception:
        raise HTTPException(status_code=500, detail="Ошибка при выполнении поиска")


@router.post("/similarity", response_model=List[SearchResult])
async def get_similar_materials_by_id(
        request: SimilarityRequest,
        service: SimilarityService = Depends(get_similarity_service)
):
    try:
        results = service.get_similar_materials(
            material_id=request.material_id,
            limit=request.limit
        )

        return [
            SearchResult(
                material_id=item["material_id"],
                similarity=item["similarity"]
            )
            for item in results
        ]
    except Exception as e:
        logging.error(f"Ошибка в эндпоинте similarity: {e}")
        raise HTTPException(
            status_code=500,
            detail="Ошибка при получении похожих материалов"
        )


@router.post("/rag/index", response_model=RagIndexResponse)
async def start_chunk_indexing(
    background_tasks: BackgroundTasks,
    service: ChunkIndexService = Depends(get_chunk_index_service),
):
    background_tasks.add_task(service.index_all)
    return RagIndexResponse(
        status="accepted",
        message="Индексация чанков запущена (без LLM)",
    )


@router.post("/rag/query", response_model=RagQueryResponse)
async def rag_query(
    request: RagQueryRequest,
    service: RagService = Depends(get_rag_service),
):
    try:
        hits = service.query(
            request.query,
            limit=request.limit,
            threshold=request.threshold,
            material_id=request.material_id,
            document_type=request.document_type,
            role=request.role,
            section=request.section,
            source_file=request.source_file,
            doc_id=request.doc_id,
            exclude_section=request.exclude_section or (
                None if request.source_file or request.doc_id or request.section else PLAYGROUND_SECTION
            ),
            important_only=request.important_only,
        )
        return RagQueryResponse(
            query=request.query,
            results=[RagHit(**hit) for hit in hits],
        )
    except Exception as exc:
        logging.error("Ошибка RAG retrieve: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Ошибка поиска по чанкам")


@router.post("/rag/answer", response_model=RagAnswerResponse)
async def rag_answer(
    request: RagQueryRequest,
    service: RagService = Depends(get_rag_service),
):
    try:
        data = service.answer(
            request.query,
            limit=request.limit,
            threshold=request.threshold,
            material_id=request.material_id,
            document_type=request.document_type,
            role=request.role,
            section=request.section,
            source_file=request.source_file,
            doc_id=request.doc_id,
            exclude_section=request.exclude_section or (
                None if request.source_file or request.doc_id or request.section else PLAYGROUND_SECTION
            ),
            important_only=request.important_only,
        )
        return RagAnswerResponse(
            query=data["query"],
            answer=data.get("answer"),
            provider=data.get("provider"),
            warning=data.get("warning"),
            results=[RagHit(**hit) for hit in data.get("results") or []],
        )
    except Exception as exc:
        logging.error("Ошибка RAG answer: %s", exc, exc_info=True)
        raise HTTPException(status_code=502, detail="Не удалось получить ответ языковой модели")


@router.get("/rag/stats", response_model=RagStatsResponse)
async def rag_stats():
    repo = ChunkRepository(DatabaseManager())
    documents = repo.list_documents()
    return RagStatsResponse(
        total_chunks=repo.count(),
        playground_chunks=repo.count(PLAYGROUND_SECTION),
        document_count=len(documents),
    )


@router.get("/rag/documents", response_model=RagDocumentsResponse)
async def rag_documents():
    repo = ChunkRepository(DatabaseManager())
    return RagDocumentsResponse(
        documents=[RagDocumentItem(**item) for item in repo.list_documents()],
    )


@router.post("/rag/ingest", response_model=RagIngestResponse)
async def rag_ingest(
    request: RagIngestRequest,
    service: PlaygroundIngestService = Depends(get_playground_ingest),
):
    try:
        return RagIngestResponse(**service.ingest_base64(request.filename, request.content_base64))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logging.error("Ошибка RAG ingest: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail="Не удалось проиндексировать файл")