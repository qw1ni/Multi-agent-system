import os
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)
load_dotenv()


class DatabaseManager:
    def __init__(self):
        self.conn_params = {
            "dbname": os.getenv("DB_NAME"),
            "user": os.getenv("DB_USER"),
            "password": os.getenv("DB_PASSWORD"),
            "host": os.getenv("DB_HOST"),
            "port": os.getenv("DB_PORT")
        }
        self.test_connection()

    def test_connection(self):
        try:
            with self.get_connection() as conn:
                logger.info(
                    f"Успешное подключение к БД: {self.conn_params['dbname']}")
        except Exception as e:
            logger.error(f"Ошибка подключения к базе данных: {e}")

    def get_connection(self):
        try:
            return psycopg2.connect(**self.conn_params)
        except psycopg2.Error as e:
            logger.error(f"Не удалось создать соединение: {e}")
            raise

    def execute_query(self, query, params=None, fetch=False):
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute(query, params)
                    if fetch:
                        return cur.fetchall()
                    conn.commit()
        except Exception as e:
            logger.error(f"Ошибка выполнения запроса: {e}\nQuery: {query}")
            raise

    def execute_batch(self, query, data):
        try:
            with self.get_connection() as conn:
                with conn.cursor() as cur:
                    execute_values(cur, query, data)
                    conn.commit()
                    logger.info(f"Успешно вставлено/обновлено записей: {len(data)}")
        except Exception as e:
            logger.error(f"Ошибка при массовой вставке: {e}")
            conn.rollback()
            raise
