import os
import uvicorn
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import logging
from dotenv import load_dotenv
from app.routes import ai_routes
from app.providers.model_loader import ModelLoader

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(levelname)s | %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)
load_dotenv()


app = FastAPI()
origins = [
    os.getenv("PARSER_URL")
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(ai_routes.router)


@app.get("/", tags=["Root"])
async def root():
    return {"status": "online", "service": "AI Service"}

if __name__ == "__main__":
    ModelLoader.get_model()
    host = os.getenv("HOST")
    port = int(os.getenv("PORT"))

    print(f"Запуск сервера на {host}:{port}")

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=True
    )
