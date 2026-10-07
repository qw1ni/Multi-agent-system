import logging
from sentence_transformers import SentenceTransformer
from app.repositories.material_repository import MaterialRepository

logger = logging.getLogger(__name__)


class ReindexService:
    def __init__(self, repo: MaterialRepository, model: SentenceTransformer):
        self.repo = repo
        self.model = model
        self.batch_size = 100

    def reindex_all_materials(self):
        try:
            total_count = self.repo.get_total_materials_count()
            if total_count == 0:
                logger.warning("В таблице materials нет данных")
                return

            logger.info(f"Запуск процесса векторизации")
            logger.info(f"Найдено материалов для обработки: {total_count}")

            processed_count = 0

            for offset in range(0, total_count, self.batch_size):
                batch_materials = self.repo.get_materials_batch(limit=self.batch_size, offset=offset)

                if not batch_materials:
                    break

                embeddings_to_save = []

                # Генерация эмбеддингов для каждого материала в пакете
                for row in batch_materials:
                    m_id, title, specs = row
                    logger.info(row)
                    full_text = f"{title}. {specs}"
                    clean_text = " ".join(full_text.split())
                    vector = self.model.encode(clean_text).tolist()
                    embeddings_to_save.append((m_id, vector))

                # Сохранение подготовленного пакета векторов в БД
                if embeddings_to_save:
                    self.repo.upsert_embeddings_batch(embeddings_to_save)

                processed_count += len(batch_materials)
                percent = (processed_count / total_count) * 100
                logger.info(f"Прогресс: {processed_count}/{total_count} ({percent:.1f}%)")

        except Exception as e:
            logger.error(f"Ошибка при переиндексации базы знаний: {e}", exc_info=True)
            raise e
