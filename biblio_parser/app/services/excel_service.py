import pandas as pd
import logging
import os

logger = logging.getLogger(__name__)


class ExcelService:
    def __init__(self, repository, log_sender):
        self.repository = repository
        self.file_path = os.getenv("DISCIPLINES_EXCEL_PATH")
        self.log_sender = log_sender

    def import_disciplines_from_excel(self):

        try:
            df = pd.read_excel(self.file_path, sheet_name="2026")
        except Exception as e:
            logging.error(f"Не удалось прочитать файл: {e}")
            self.log_sender.send_log(f"Не удалось прочитать файл: {e}", "ERROR")
            return

        for index, row in df.iterrows():
            dept_name = str(row['Кафедра']).strip()
            disc_name = str(row['Дисциплина']).strip()
            spec_raw = str(row['Специальность/ Направление подготовки']).strip()
            raw_year = str(row['Год начала подготовки']).strip()
            clean_year_str = raw_year.replace(" ", "")
            year = int(clean_year_str)

            dept_id = self.repository.get_dept_id(dept_name)
            logger.info(f"Данные: {dept_name}, {disc_name}, {spec_raw}, {year}, ID: {dept_id}")

            if not dept_id:
                logging.warning(f"Строка {index + 2}: Кафедра '{dept_name}' не найдена.")
                continue

            disc_id = self.repository.save_discipline(disc_name)
            self.repository.link_department(dept_id, disc_id, year)
            self.repository.link_specialty(disc_id, spec_raw)

        logger.info("Импорт дисциплин успешно завершен")
        self.log_sender.send_log("Импорт дисциплин успешно завершен", "SUCCESS")

