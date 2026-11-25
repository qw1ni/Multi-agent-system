import os
import re
import logging
import threading
from pathlib import Path
from urllib.parse import urlparse, unquote

import requests

from app.providers.parser import KNOWN_SECTIONS

logger = logging.getLogger(__name__)

# Общий на процесс: DownloadService создаётся заново на каждый запрос
_stop_event = threading.Event()


class DownloadStopped(Exception):
    pass


def request_stop():
    _stop_event.set()


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
    if " / " in name:
        return name.split(" / ", 1)[0]
    return name or "Прочее"


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

        extra = [name for name in counts if name not in KNOWN_SECTIONS]
        names = list(KNOWN_SECTIONS) + extra
        return [
            {"id": section, "name": section, "materials_count": counts.get(section, 0)}
            for section in names
        ]

    def run_download(self, sections=None, limit=None):
        selected = None
        if sections:
            selected = [s for s in sections if str(s).strip()]
            if not selected:
                self._log("Не выбраны корректные разделы для скачивания", "ERROR")
                return

        _stop_event.clear()
        label = ", ".join(selected) if selected else "все разделы"
        portion = f", не больше {int(limit)} новых" if limit else ""
        self._log(f"Запуск скачивания файлов ({label}{portion})...")
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

        def log_stopped(done: int):
            self._log(
                f"Скачивание остановлено пользователем на {done}/{total}. "
                f"Новых: {downloaded}, уже были: {skipped}, ошибок: {failed}",
                "WARNING",
            )

        for index, row in enumerate(materials, start=1):
            if _stop_event.is_set():
                log_stopped(index - 1)
                return

            material_id = row["id"]
            title = row["title"] or "material"
            file_url = row["file_link"]
            section = resolve_section(row.get("faculty_name"))
            section_dir = self.download_dir / self._safe_name(section)
            section_dir.mkdir(parents=True, exist_ok=True)

            ext = self._extension_from_url(file_url)
            filename = f"{material_id}_{self._safe_name(title)}{ext}"
            target = section_dir / filename
            partial = target.with_name(target.name + ".part")

            if target.exists() and target.stat().st_size > 0:
                skipped += 1
            else:
                try:
                    with requests.get(file_url, stream=True, timeout=120) as response:
                        response.raise_for_status()
                        with open(partial, "wb") as out:
                            for chunk in response.iter_content(chunk_size=65536):
                                if _stop_event.is_set():
                                    raise DownloadStopped()
                                if chunk:
                                    out.write(chunk)
                    partial.replace(target)
                    downloaded += 1
                    if limit and downloaded >= int(limit):
                        self._log(
                            f"Порция скачана: {downloaded} новых файлов. Остальное не трогаю."
                        )
                        return
                except DownloadStopped:
                    partial.unlink(missing_ok=True)
                    log_stopped(index - 1)
                    return
                except Exception as e:
                    failed += 1
                    logger.error(f"Ошибка скачивания id={material_id}: {e}")
                    partial.unlink(missing_ok=True)

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
