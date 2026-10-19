import os
import re
import logging
import threading

from app.repositories.material_repository import extract_handle

logger = logging.getLogger(__name__)


def _normalize_issued_year(value):
    """БД ждёт год (integer), на сайте иногда приходит дата DD.MM.YYYY."""
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    if text.isdigit():
        return int(text)
    match = re.match(r"(\d{2})\.(\d{2})\.(\d{4})", text)
    if match:
        return int(match.group(3))
    match = re.search(r"(19|20)\d{2}", text)
    if match:
        return int(match.group(0))
    return None


def _clip(text: str, limit: int = 255) -> str:
    if not text:
        return text
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"


class ParserService:
    """Парсинг одного корневого раздела. Используется агентами роя."""

    def __init__(self, crawler, repository, log_sender,
                 log_prefix: str = "", known_handles=None,
                 stop_event: threading.Event = None,
                 stats: dict = None, done_handles: set = None):
        self.crawler = crawler
        self.repo = repository
        self.ai_reindex_url = os.getenv("AI_SERVER_URL_REINDEX")
        self.chunk_size = 50
        self.log_sender = log_sender
        self.log_prefix = log_prefix
        # None — парсить всё; set — пропускать материалы с этими handle
        self.known_handles = known_handles
        self.stop_event = stop_event or threading.Event()
        self.current_node = None
        # stats и done_handles передаёт агент, чтобы после перезапуска счётчики
        # продолжались, а уже записанные материалы не обрабатывались повторно
        self.stats = stats if stats is not None else {}
        for key in ("nodes", "processed", "saved", "skipped_known",
                    "skipped_no_file", "failed_batches", "failed_materials"):
            self.stats.setdefault(key, 0)
        self.done_handles = done_handles if done_handles is not None else set()

    def _log(self, message: str, level: str = "INFO"):
        text = f"{self.log_prefix} {message}" if self.log_prefix else message
        if level == "ERROR":
            logger.error(text)
        else:
            logger.info(text)
        self.log_sender.send_log(text, level)

    @staticmethod
    def _handle(mat_info: dict):
        return extract_handle(mat_info.get("relative_path") or mat_info["url"])

    @property
    def stopped(self) -> bool:
        return self.stop_event.is_set()

    def _flush(self, batch, handles):
        if not batch:
            return
        if self.repo.save_materials_batch(batch):
            self.stats["saved"] += len(batch)
            self.done_handles.update(h for h in handles if h)
        else:
            self.stats["failed_batches"] += 1
            self._log(f"Не удалось записать пакет из {len(batch)} материалов", "ERROR")
        batch.clear()
        handles.clear()

    def process_root_section(self, root: dict) -> bool:
        """Возвращает False, если раздел не удалось загрузить."""
        root_html = self.crawler.fetch_page(root["url"])
        if not root_html:
            self._log(f"Не удалось загрузить раздел {root['name']}", "ERROR")
            return False

        # L1 = faculty (префикс корня для уникальности имён)
        faculties = self.crawler.parse_communities(root_html)
        self._log(f"Узлов L1 в разделе: {len(faculties)}")

        for fac_data in faculties:
            if self.stopped:
                return True

            faculty_name = _clip(f"{root['name']} / {fac_data['name']}")
            faculty_id = self.repo.save_faculty(faculty_name, fac_data["url"])
            if not faculty_id:
                continue

            self._log(f"Обработка: {faculty_name}")

            fac_html = self.crawler.fetch_page(fac_data["url"])
            if not fac_html:
                continue

            departments = self.crawler.parse_communities(fac_html)

            # Если вложенных сообществ нет — материалы лежат прямо на L1
            if not departments:
                self._process_department_materials(
                    dept_name=_clip(f"{faculty_name} / материалы"),
                    dept_url=fac_data["url"],
                    count=fac_data.get("count", 0),
                    faculty_id=faculty_id,
                )
                continue

            for dept_data in departments:
                if self.stopped:
                    return True
                dept_name = _clip(f"{fac_data['name']} / {dept_data['name']}")
                self._process_department_materials(
                    dept_name=dept_name,
                    dept_url=dept_data["url"],
                    count=dept_data.get("count", 0),
                    faculty_id=faculty_id,
                )
        return True

    def _process_department_materials(self, dept_name, dept_url, count, faculty_id):
        dept_id = self.repo.save_department(dept_name, dept_url, faculty_id)
        if not dept_id:
            return

        self.current_node = dept_name
        self.stats["nodes"] += 1
        self._log(f"Кафедра/узел: {dept_name} (материалов: {count})")

        materials_list = self.crawler.get_all_materials(dept_url, count)

        if self.known_handles is not None:
            new_materials = [m for m in materials_list if self._handle(m) not in self.known_handles]
            already = len(materials_list) - len(new_materials)
            self.stats["skipped_known"] += already
            if already:
                self._log(f"Уже в БД: {already}, новых к обработке: {len(new_materials)}")
            materials_list = new_materials

        if self.done_handles:
            materials_list = [m for m in materials_list if self._handle(m) not in self.done_handles]
        if not materials_list:
            return

        materials_batch = []
        batch_handles = []
        skipped_no_file = 0

        for index, mat_info in enumerate(materials_list, start=1):
            if self.stopped:
                break

            mat_html = self.crawler.fetch_page(mat_info["url"])
            if not mat_html:
                continue
            self.stats["processed"] += 1

            try:
                metadata = self.crawler.parse_material_metadata(mat_html)
            except Exception as e:
                logger.exception(f"{self.log_prefix} не удалось разобрать {mat_info['url']}")
                self.stats["failed_materials"] += 1
                self._log(f"Пропущен материал (ошибка разбора: {e}): {mat_info['url']}", "WARNING")
                continue
            if not metadata.get("file_link"):
                skipped_no_file += 1
                continue

            material_tuple = (
                metadata.get("title") or mat_info["title"],
                metadata.get("title_alternative"),
                metadata.get("abstract"),
                metadata.get("language", "ru"),
                metadata.get("publisher"),
                metadata.get("bibliographic_citation"),
                metadata.get("identifier"),
                metadata.get("available"),
                _normalize_issued_year(metadata.get("issued")),
                metadata.get("pages"),
                metadata.get("file_link"),
                dept_id,
                metadata.get("creator", []),
                metadata.get("subject", []),
                metadata.get("type", []),
                metadata.get("udc", []),
                metadata.get("spec", []),
            )
            materials_batch.append(material_tuple)
            batch_handles.append(self._handle(mat_info))

            if index % 10 == 0 or index == len(materials_list):
                self._log(f"Собрано метаданных: {index} из {len(materials_list)}")

            if len(materials_batch) >= self.chunk_size:
                self._log(f"Достигнут лимит пакета ({self.chunk_size}). Запись в БД...")
                self._flush(materials_batch, batch_handles)

        if materials_batch:
            self._log(f"Запись пакета из {len(materials_batch)} материалов в БД...")
            self._flush(materials_batch, batch_handles)

        self.stats["skipped_no_file"] += skipped_no_file
        if skipped_no_file:
            self._log(f"Пропущено без файла: {skipped_no_file}")
