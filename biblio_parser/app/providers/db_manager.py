import os
from dotenv import load_dotenv
from app.providers.queries import *
import psycopg2
from psycopg2.extras import execute_values
import logging

logger = logging.getLogger(__name__)
load_dotenv()


class DatabaseManager:
    def __init__(self):
        self.conn = None
        self.connect()

    def connect(self):
        try:
            self.conn = psycopg2.connect(
                user=os.getenv('DB_USER'),
                password=os.getenv('DB_PASSWORD'),
                host=os.getenv('DB_HOST'),
                port=os.getenv('DB_PORT'),
                database=os.getenv('DB_NAME'),
            )
            self.conn.autocommit = True
            logger.info("Подключение к БД установлено")
        except psycopg2.OperationalError as e:
            logger.error(f"Ошибка подключения к БД: {e}")
            self.conn = None

    def execute(self, query, params=None, fetch=False):
        if not self.conn:
            logger.error("Нет соединения с БД")
            return None
        try:
            with self.conn.cursor() as cur:
                cur.execute(query, params)
                if fetch:
                    result = cur.fetchone()
                    if result is None:
                        return None
                    return result[0] if len(result) == 1 else dict(result)
                return True
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Ошибка выполнения запроса: {e}\nQuery: {query}\nParams: {params}")
            return None

    def fetchall(self, query, params=None):
        if not self.conn:
            return []
        try:
            with self.conn.cursor() as cur:
                cur.execute(query, params)
                columns = [desc[0] for desc in cur.description]
                return [dict(zip(columns, row)) for row in cur.fetchall()]
        except Exception as e:
            logger.error(f"Ошибка fetchall: {e}")
            return []

    def initialize_db(self):
        if not self.conn:
            return False
        try:
            with self.conn.cursor() as cur:
                for command in INIT_DB_COMMANDS:
                    logger.info(f"SQL: {command[:100]}...")  # Первые 100 символов
                    cur.execute(command)
            self.conn.commit()
            logger.info("Таблицы успешно созданы")
            return True
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Ошибка инициализации БД: {e}")
            return False

    def execute_batch(self, query, page_size=1000):
        if not self.conn:
            logger.error("Нет соединения с БД")
            return False
        try:
            with self.conn.cursor() as cur:
                cur.execute(query)
                return True
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Ошибка выполнения пакетного SQL: {e}")
            return False

    def insert_values(self, query, value_list, page_size=1000):
        if not self.conn:
            logger.error("Нет соединения с БД")
            return False
        if not value_list:
            return True
        try:
            with self.conn.cursor() as cur:
                psycopg2.extras.execute_values(cur, query, value_list, page_size=page_size)
                return True
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Ошибка пакетной вставки: {e}")
            return False

    def close(self):
        if self.conn:
            self.conn.close()
            logger.info("Соединение с БД закрыто")
            self.conn = None
