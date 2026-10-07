import os
import re
import logging

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
    def __init__(self, crawler, repository, log_sender):
        self.crawler = crawler
        self.repo = repository
        self.ai_reindex_url = os.getenv("AI_SERVER_URL_REINDEX")
        self.chunk_size = 50
        self.log_sender = log_sender

    def _log(self, message: str, level: str = "INFO"):
        if level == "ERROR":
            logger.error(message)
        else:
            logger.info(message)
        self.log_sender.send_log(message, level)

    def run_full_sync(self):
        self._log("Запуск парсера электронной библиотеки...")

        main_html = self.crawler.fetch_page(self.crawler.base_url)
        if not main_html:
            self._log("Не удалось загрузить главную страницу", "ERROR")
            return

        roots = self.crawler.parse_root_sections(main_html)
        if not roots:
            self._log("Корневые разделы на главной не найдены", "ERROR")
            return

        self._log(f"Найдено корневых разделов: {len(roots)}")
        for root in roots:
            self._log(f"Раздел: {root['name']} ({root['url']})")
            self._process_root_section(root)

        self._log("Парсинг завершен")

    def _process_root_section(self, root: dict):
        root_html = self.crawler.fetch_page(root["url"])
        if not root_html:
            self._log(f"Не удалось загрузить раздел {root['name']}", "ERROR")
            return

        # L1 = faculty (префикс корня для уникальности имён)
        faculties = self.crawler.parse_communities(root_html)
        self._log(f"[{root['name']}] узлов L1: {len(faculties)}")

        for fac_data in faculties:
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
                dept_name = _clip(f"{fac_data['name']} / {dept_data['name']}")
                self._process_department_materials(
                    dept_name=dept_name,
                    dept_url=dept_data["url"],
                    count=dept_data.get("count", 0),
                    faculty_id=faculty_id,
                )

    def _process_department_materials(self, dept_name, dept_url, count, faculty_id):
        dept_id = self.repo.save_department(dept_name, dept_url, faculty_id)
        if not dept_id:
            return

        self._log(f"Кафедра/узел: {dept_name} (материалов: {count})")

        materials_list = self.crawler.get_all_materials(dept_url, count)
        materials_batch = []
        skipped_no_file = 0

        for index, mat_info in enumerate(materials_list, start=1):
            mat_html = self.crawler.fetch_page(mat_info["url"])
            if not mat_html:
                continue

            metadata = self.crawler.parse_material_metadata(mat_html)
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

            if index % 10 == 0 or index == len(materials_list):
                self._log(f"Собрано метаданных: {index} из {len(materials_list)}")

            if len(materials_batch) >= self.chunk_size:
                self._log(f"Достигнут лимит пакета ({self.chunk_size}). Запись в БД...")
                self.repo.save_materials_batch(materials_batch)
                materials_batch.clear()

        if materials_batch:
            self._log(f"Запись пакета из {len(materials_batch)} материалов в БД...")
            self.repo.save_materials_batch(materials_batch)

        if skipped_no_file:
            self._log(f"Пропущено без файла: {skipped_no_file}")
