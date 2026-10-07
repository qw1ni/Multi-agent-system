import os
from fastapi import FastAPI
from dotenv import load_dotenv
import uvicorn
from contextlib import asynccontextmanager
from app.routes import routes
from app.providers.db_manager import DatabaseManager
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)
load_dotenv()


# Управление жизненным циклом приложения
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Проверка и инициализация структуры базы данных...")
    db = DatabaseManager()

    if db.conn:
        success = db.initialize_db()
        if success:
            logger.info("Инициализация БД прошла успешно")
        else:
            logger.error("Ошибка при подготовке таблиц БД")
        db.close()
    else:
        logger.error("Не удалось подключиться к БД при старте сервера!")

    yield

    logger.info("Остановка сервера парсера...")

app = FastAPI(
    lifespan=lifespan
)
app.include_router(routes.router)


@app.get("/")
async def root():
    return {"message": "Сервер сбора данных ИАС БРУ работает"}

if __name__ == "__main__":
    host = os.getenv("HOST")
    port = int(os.getenv("PORT"))
    logger.info(f"Запуск сервера на {host}:{port}")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)




