from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
import logging
from typing import List
from app.providers.model_loader import ModelLoader
from app.services.reindex_service import ReindexService
from app.services.search_service import SearchService
from app.services.similarity_service import SimilarityService
from app.repositories.material_repository import MaterialRepository
from app.providers.database import DatabaseManager
from app.routes.schemas import SearchRequest, SearchResult, ReindexResponse, SimilarityRequest

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