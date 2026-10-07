import os
from pathlib import Path
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).resolve().parent.parent.parent
env_path = BASE_DIR / ".env"

load_dotenv(dotenv_path=env_path)


class ModelLoader:
    _instance = None

    @classmethod
    def get_model(cls):
        if cls._instance is None:
            model_name = os.getenv("MODEL_NAME")

            local_path = BASE_DIR / "models" / model_name

            if local_path.exists():
                print(f"Загрузка локальной модели из: {local_path}")
                cls._instance = SentenceTransformer(str(local_path))
            else:
                print(f"Локальная модель не найдена. Загрузка модели: {model_name}")
                cls._instance = SentenceTransformer(model_name)
                cls._instance.save(str(local_path))
        
        return cls._instance
