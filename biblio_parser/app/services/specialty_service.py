import pandas as pd
import logging
import os

logger = logging.getLogger(__name__)


class SpecialtyService:
    def __init__(self, repository):
        self.repository = repository
        self.file_path = os.getenv("SPECIALTY_EXCEL_FILE")

    def import_specialties_from_file(self):

        try:
            df = pd.read_excel(self.file_path, sheet_name="Лист2")
        except Exception as e:
            logging.error(f"Не удалось прочитать файл: {e}")
            return

        for index, row in df.iterrows():
            spec_code = str(row['Шифр специальности']).strip()
            spec_name = str(row['Название']).strip()

            logger.info(f"Данные: {spec_code}, {spec_name}")

            self.repository.save_specialty(spec_code, spec_name)

        logger.info("Импорт успешно завершен")

