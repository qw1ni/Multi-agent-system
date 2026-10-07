from app.providers.queries import INSERT_MAP, SELECT_MAP


class DisciplineRepository:
    def __init__(self, db_manager):
        self.db = db_manager

    def get_dept_id(self, name):
        return self.db.execute(SELECT_MAP['get_department'], (name,), fetch=True)

    def save_discipline(self, name):
        return self.db.execute(INSERT_MAP['discipline'], (name,), fetch=True)

    def link_department(self, dept_id, disc_id, year):
        self.db.execute(INSERT_MAP['department_discipline'], (dept_id, disc_id, year))

    def link_specialty(self, disc_id, spec_code):
        self.db.execute(INSERT_MAP['discipline_specialty'], (disc_id, spec_code))

