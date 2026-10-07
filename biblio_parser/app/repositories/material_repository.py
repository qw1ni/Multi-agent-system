import logging
from app.providers.queries import INSERT_MAP, CREATE_TEMP_STAGE_TABLE, INSERT_INTO_STAGE, BATCH_DISTRIBUTE_DATA

logger = logging.getLogger(__name__)


class MaterialRepository:
    def __init__(self, db_manager):
        self.db = db_manager
        self.insert_queries = INSERT_MAP

    def save_faculty(self, name, url):
        return self.db.execute(self.insert_queries['faculty'], (name, url), fetch=True)

    def save_department(self, name, url, faculty_id):
        return self.db.execute(self.insert_queries['department'], (name, url, faculty_id), fetch=True)

    def save_materials_batch(self, batch_data):
        if not batch_data:
            return True

        old_autocommit = self.db.conn.autocommit
        self.db.conn.autocommit = False

        try:
            if not self.db.execute_batch(CREATE_TEMP_STAGE_TABLE):
                raise Exception("Не удалось создать временную таблицу stage")
            if not self.db.insert_values(INSERT_INTO_STAGE, batch_data):
                raise Exception("Не удалось вставить данные во временную таблицу")
            if not self.db.execute_batch(BATCH_DISTRIBUTE_DATA):
                raise Exception("Ошибка при распределении пакетных данных по таблицам")
            self.db.conn.commit()
            logger.info(f"Пакет из {len(batch_data)} материалов успешно сохранен в БД.")
            return True
        except Exception as e:
            self.db.conn.rollback()
            logger.error(f"Ошибка при выполнении пакетного сохранения: {e}")
            return False
        finally:
            self.db.conn.autocommit = old_autocommit

    def save_author(self, name):
        return self.db.execute(self.insert_queries['author'], (name,), fetch=True)

    def save_keyword(self, word):
        return self.db.execute(self.insert_queries['keyword'], (word,), fetch=True)

    def save_specialty(self, spec_code, spec_name):
        return self.db.execute(self.insert_queries['specialty'], (spec_code, spec_name), fetch=False)

    def save_type(self, type_name):
        return self.db.execute(self.insert_queries['type'], (type_name,), fetch=True)

    def save_udc_code(self, code, title=None):
        # title может быть None
        return self.db.execute(self.insert_queries['udc_code'], (code, title), fetch=False)

    def save_role(self, name):
        return self.db.execute(self.insert_queries['role'], (name,), fetch=True)

    def save_discipline(self, name):
        return self.db.execute(self.insert_queries['discipline'], (name,), fetch=True)

    def save_material(self, title, uri, file_link, department_id,
                      alternative_title=None, abstract_text=None,
                      language_code='ru', publisher=None, citation=None,
                      available_date=None, issued_year=None, pages=None):
        return self.db.execute(
            self.insert_queries['material'],
            (title, alternative_title, abstract_text, language_code,
             publisher, citation, uri, available_date, issued_year,
             pages, file_link, department_id),
            fetch=True
        )

    def save_user(self, full_name, login, password, role_id,
                  faculty_id=None, department_id=None):
        return self.db.execute(
            self.insert_queries['user'],
            (full_name, login, password, faculty_id, department_id, role_id),
            fetch=True
        )

    def save_material_author(self, material_id, author_id):
        return self.db.execute(
            self.insert_queries['material_author'],
            (material_id, author_id),
            fetch=False
        )

    def save_material_keyword(self, material_id, keyword_id):
        return self.db.execute(
            self.insert_queries['material_keyword'],
            (material_id, keyword_id),
            fetch=False
        )

    def save_material_specialty(self, material_id, spec_code):
        return self.db.execute(
            self.insert_queries['material_specialty'],
            (material_id, spec_code),
            fetch=False
        )

    def save_material_type(self, material_id, type_id):
        return self.db.execute(
            self.insert_queries['material_type'],
            (material_id, type_id),
            fetch=False
        )

    def save_material_udc(self, material_id, code_udc):
        return self.db.execute(
            self.insert_queries['material_udc'],
            (material_id, code_udc),
            fetch=False
        )

    def save_discipline_specialty(self, discipline_id, spec_code):
        return self.db.execute(
            self.insert_queries['discipline_specialty'],
            (discipline_id, spec_code),
            fetch=False
        )

    def save_department_discipline(self, department_id, discipline_id, year_start):
        return self.db.execute(
            self.insert_queries['department_discipline'],
            (department_id, discipline_id, year_start),
            fetch=True
        )
