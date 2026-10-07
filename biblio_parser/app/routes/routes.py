import os
import threading
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.services.parser_service import ParserService
from app.services.excel_service import ExcelService
from app.services.specialty_service import SpecialtyService
from app.services.download_service import DownloadService, KNOWN_SECTIONS
from app.providers.db_manager import DatabaseManager
from app.providers.parser import SiteCrawler
from app.providers.log_sender import LogSender
from app.repositories.material_repository import MaterialRepository
from app.repositories.discipline_repository import DisciplineRepository


router = APIRouter(prefix="/api/parser", tags=["Parser"])

_parser_lock = threading.Lock()
_download_lock = threading.Lock()


class DownloadFilesRequest(BaseModel):
    sections: Optional[List[str]] = Field(
        default=None,
        description="Список разделов для скачивания. Пусто / null = все.",
    )


def get_parser_service():
    db_manager = DatabaseManager()
    crawler = SiteCrawler(
        base_url=os.getenv("BASE_URL"),
        faculties_link=os.getenv("FACULTIES_LINK")
    )
    repository = MaterialRepository(db_manager)
    log_sender = LogSender()
    return ParserService(crawler, repository, log_sender)


def get_excel_service():
    db_manager = DatabaseManager()
    repository = DisciplineRepository(db_manager)
    log_sender = LogSender()
    return ExcelService(repository, log_sender)


def get_specialty_service():
    db_manager = DatabaseManager()
    repository = MaterialRepository(db_manager)
    return SpecialtyService(repository)


def get_download_service():
    db_manager = DatabaseManager()
    repository = MaterialRepository(db_manager)
    log_sender = LogSender()
    return DownloadService(repository, log_sender)


def _run_in_thread(target, *args, lock: threading.Lock = None):
    """Запускает долгую задачу в отдельном потоке, чтобы не блокировать API."""
    def runner():
        if lock and not lock.acquire(blocking=False):
            return
        try:
            target(*args)
        finally:
            if lock:
                lock.release()

    thread = threading.Thread(target=runner, daemon=True)
    thread.start()
    return thread


@router.post("/start")
async def start_parser_endpoint(
        service: ParserService = Depends(get_parser_service)
):
    if _parser_lock.locked():
        return {
            "status": "busy",
            "message": "Парсер уже выполняется"
        }

    _run_in_thread(service.run_full_sync, lock=_parser_lock)

    return {
        "status": "accepted",
        "message": "Процесс парсинга запущен в фоновом режиме"
    }


@router.get("/sections")
async def list_sections_endpoint(
        service: DownloadService = Depends(get_download_service)
):
    try:
        sections = service.get_sections_info()
    except Exception:
        sections = [
            {"id": name, "name": name, "materials_count": 0}
            for name in KNOWN_SECTIONS
        ]
    return {
        "status": "ok",
        "sections": sections
    }


@router.post("/download_files")
async def download_files_endpoint(
        body: DownloadFilesRequest = DownloadFilesRequest(),
        service: DownloadService = Depends(get_download_service)
):
    sections = body.sections

    if _download_lock.locked():
        return {
            "status": "busy",
            "message": "Скачивание уже выполняется"
        }

    _run_in_thread(service.run_download, sections, lock=_download_lock)

    if sections:
        message = f"Скачивание файлов запущено для разделов: {', '.join(sections)}"
    else:
        message = "Скачивание файлов запущено для всех разделов"

    return {
        "status": "accepted",
        "message": message
    }


@router.post("/import_disciplines")
async def import_disciplines_endpoint(
        service: ExcelService = Depends(get_excel_service)
):
    _run_in_thread(service.import_disciplines_from_excel)

    return {
        "status": "accepted",
        "message": "Импорт дисциплин из файла запущен в фоновом режиме"
    }


@router.post("/import_specialties")
async def import_specialties_endpoint(
        service: SpecialtyService = Depends(get_specialty_service)
):
    _run_in_thread(service.import_specialties_from_file)

    return {
        "status": "accepted",
        "message": "Импорт специальностей из файла запущен в фоновом режиме"
    }
