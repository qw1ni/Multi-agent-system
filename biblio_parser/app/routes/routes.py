import threading
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.services.excel_service import ExcelService
from app.services.specialty_service import SpecialtyService
from app.services.download_service import DownloadService, KNOWN_SECTIONS, request_stop
from app.providers.db_manager import DatabaseManager
from app.providers.log_sender import LogSender
from app.repositories.material_repository import MaterialRepository
from app.repositories.discipline_repository import DisciplineRepository
from app.swarm import parsing_orchestrator as orchestrator


router = APIRouter(prefix="/api/parser", tags=["Parser"])

_download_lock = threading.Lock()


class StartParserRequest(BaseModel):
    mode: Literal["full", "incremental"] = Field(
        default="full",
        description="full — парсить всё с нуля, incremental — пропускать материалы, уже есть в БД.",
    )
    sections: Optional[List[str]] = Field(
        default=None,
        description="Корневые разделы для парсинга (например «Факультеты», «РФ 3++»). Пусто / null = все.",
    )


class DownloadFilesRequest(BaseModel):
    sections: Optional[List[str]] = Field(
        default=None,
        description="Список разделов для скачивания. Пусто / null = все.",
    )


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
async def start_parser_endpoint(body: StartParserRequest = StartParserRequest()):
    sections = [s for s in (body.sections or []) if s and s.strip()] or None
    if not orchestrator.start(body.mode, sections):
        return {
            "status": "busy",
            "message": "Рой парсинга уже работает"
        }

    what = "парсинг новых материалов" if body.mode == "incremental" else "парсинг с нуля"
    where = f" — разделы: {', '.join(sections)}" if sections else " — все разделы"
    return {
        "status": "accepted",
        "message": f"Рой агентов запущен: {what}{where}",
    }


@router.post("/stop")
async def stop_parser_endpoint():
    if not orchestrator.stop():
        return {
            "status": "idle",
            "message": "Парсинг сейчас не выполняется"
        }

    return {
        "status": "accepted",
        "message": "Остановка роя запрошена"
    }


@router.get("/status")
async def parser_status_endpoint():
    return {
        "status": "ok",
        "parsing": orchestrator.is_running(),
        "downloading": _download_lock.locked(),
        "swarm": orchestrator.status(),
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
        "sections": sections,
        "parsing": orchestrator.is_running(),
        "downloading": _download_lock.locked(),
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


@router.post("/download_stop")
async def download_stop_endpoint():
    if not _download_lock.locked():
        return {
            "status": "idle",
            "message": "Скачивание сейчас не выполняется"
        }

    request_stop()

    return {
        "status": "accepted",
        "message": "Остановка скачивания запрошена"
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
