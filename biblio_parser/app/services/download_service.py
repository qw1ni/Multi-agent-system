import os
import re
import logging
from pathlib import Path
from urllib.parse import urlparse, unquote

import requests

logger = logging.getLogger(__name__)

# Короткие имена разделов (как в парсере ROOT_SECTION_PATHS)
KNOWN_SECTIONS = [
    "ОКРБ 011-2009",
    "ОКРБ 011-2022",
    "РФ",
    "РФ 3++",
    "Факультеты",
]

SELECT_MATERIALS_WITH_FILES = """
SELECT m.id, m.title, m.file_link, f.name AS faculty_name
FROM materials m
JOIN departments d ON d.id = m.department_id
JOIN faculties f ON f.id = d.faculty_id
WHERE m.file_link IS NOT NULL AND m.file_link <> ''
ORDER BY m.id
"""

SELECT_SECTION_STATS = """
SELECT f.name AS faculty_name, COUNT(m.id) AS materials_count
FROM faculties f
LEFT JOIN departments d ON d.faculty_id = f.id
LEFT JOIN materials m ON m.department_id = d.id
    AND m.file_link IS NOT NULL AND m.file_link <> ''
GROUP BY f.id, f.name
ORDER BY f.name
"""


def resolve_section(faculty_name: str) -> str:
    """Определяет корневой раздел по имени факультета в БД."""
    name = faculty_name or ""
    # Сначала более длинные префиксы
    for section in sorted(KNOWN_SECTIONS, key=len, reverse=True):
        if name.startswith(f"{section} /") or name == section:
            return section
    # Старые записи без префикса (до обновления парсера) — Факультеты
    return "Факультеты"


class DownloadService:
    def __init__(self, repository, log_sender):
        self.repo = repository
        self.log_sender = log_sender
        self.download_dir = Path(os.getenv("DOWNLOAD_DIR", "data/downloads"))

    def _log(self, message: str, level: str = "INFO"):
        if level == "ERROR":
            logger.error(message)
        else:
            logger.info(message)
        self.log_sender.send_log(message, level)

    @staticmethod
    def _safe_name(text: str, limit: int = 80) -> str:
        cleaned = re.sub(r"[^\w\s\-а-яА-ЯёЁ]+", "", text or "", flags=re.UNICODE)
        cleaned = re.sub(r"\s+", "_", cleaned).strip("_")
        return (cleaned or "material")[:limit]

    @staticmethod
    def _extension_from_url(url: str) -> str:
        path = unquote(urlparse(url).path)
        suffix = Path(path).suffix
        if suffix and len(suffix) <= 8:
            return suffix
        return ".bin"

    def get_sections_info(self):
        rows = self.repo.db.fetchall(SELECT_SECTION_STATS)
        counts = {section: 0 for section in KNOWN_SECTIONS}
        for row in rows:
            section = resolve_section(row.get("faculty_name"))
            counts[section] = counts.get(section, 0) + int(row.get("materials_count") or 0)

        return [
            {"id": section, "name": section, "materials_count": counts.get(section, 0)}
            for section in KNOWN_SECTIONS
        ]

    def run_download(self, sections=None):
        selected = None
        if sections:
            selected = [s for s in sections if s in KNOWN_SECTIONS]
            if not selected:
                self._log("Не выбраны корректные разделы для скачивания", "ERROR")
                return

        label = ", ".join(selected) if selected else "все разделы"
        self._log(f"Запуск скачивания файлов ({label})...")
        self.download_dir.mkdir(parents=True, exist_ok=True)

        materials = self.repo.db.fetchall(SELECT_MATERIALS_WITH_FILES)
        if selected:
            materials = [
                row for row in materials
                if resolve_section(row.get("faculty_name")) in selected
            ]

        total = len(materials)
        if total == 0:
            self._log("Нет материалов с file_link для выбранных разделов")
            return

        self._log(f"Найдено материалов для скачивания: {total}")
        downloaded = 0
        skipped = 0
        failed = 0

        for index, row in enumerate(materials, start=1):
            material_id = row["id"]
            title = row["title"] or "material"
            file_url = row["file_link"]
            section = resolve_section(row.get("faculty_name"))
            section_dir = self.download_dir / self._safe_name(section)
            section_dir.mkdir(parents=True, exist_ok=True)

            ext = self._extension_from_url(file_url)
            filename = f"{material_id}_{self._safe_name(title)}{ext}"
            target = section_dir / filename

            if target.exists() and target.stat().st_size > 0:
                skipped += 1
            else:
                try:
                    with requests.get(file_url, stream=True, timeout=120) as response:
                        response.raise_for_status()
                        with open(target, "wb") as out:
                            for chunk in response.iter_content(chunk_size=65536):
                                if chunk:
                                    out.write(chunk)
                    downloaded += 1
                except Exception as e:
                    failed += 1
                    logger.error(f"Ошибка скачивания id={material_id}: {e}")
                    if target.exists():
                        try:
                            target.unlink()
                        except OSError:
                            pass

            if index % 25 == 0 or index == total:
                self._log(
                    f"Прогресс скачивания: {index}/{total} "
                    f"(новых: {downloaded}, пропущено: {skipped}, ошибок: {failed})"
                )

        self._log(
            f"Скачивание завершено. Новых: {downloaded}, уже были: {skipped}, ошибок: {failed}. "
            f"Папка: {self.download_dir.resolve()}"
        )

    def run_download_all(self):
        self.run_download(sections=None)
