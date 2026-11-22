# Курсовая: сбор и обработка учебной документации

Отдельный Docker Compose для контейнеров сбора и обработки. Общий контейнер проекта `biblio-db` (его поднимает `start_all.sh` на порту 5433) эта сборка не создаёт, не останавливает и не использует.

Внутри сети `coursework_net`:

| Сервис | Контейнер | Зачем | Порт на хосте |
|---|---|---|---|
| `db` | `coursework-db` | PostgreSQL 16 с расширением `vector` | не публикуется |
| `biblio_parser` | `coursework-parser` | сбор материалов библиотеки | 18101 |
| `ai_service` | `coursework-ai` | обработка и ответы LLM | 18102 |
| `parser_agent` | `coursework-parser-agent` | управление парсером | 18103 |

`server`, `client` и визуализация сюда не входят.

## Запуск

Нужен запущенный Docker Desktop.

```bash
cd coursework
cp .env.example .env   # если .env ещё нет
docker compose up -d --build
docker compose ps
```

Проверка:

```bash
curl http://127.0.0.1:18101/
curl http://127.0.0.1:18102/
curl http://127.0.0.1:18103/health
docker inspect --format '{{json .State.Health.Status}}' coursework-parser
```

Команда агента из его контейнера:

```bash
docker compose exec parser_agent python -m parser_agent status
```

Остановка только этой сборки:

```bash
docker compose stop
```

## Пример .env

Файл уже заполнен учебными значениями. Пароли лежат только в `.env`, в образ они не копируются.

```env
POSTGRES_USER=coursework
POSTGRES_PASSWORD=coursework
POSTGRES_DB=coursework_library
DB_HOST=db
DB_PORT=5432
PARSER_PUBLISH_PORT=18101
AI_PUBLISH_PORT=18102
AGENT_PUBLISH_PORT=18103
```

При старте контейнера приложения скрипт `docker/entrypoint.sh` проверяет обязательные переменные и завершает запуск, если какой-то нет. Процесс внутри контейнера идёт от пользователя `app`, не от root. У базы официальный образ тоже работает не от root.

База доступна приложениям по имени `db:5432`. Порт контейнера наружу не проброшен: `docker port coursework-db` ничего не печатает. Если на компьютере уже установлен свой PostgreSQL, ответ `localhost:5432` даёт он, а не контейнер курсовой.

```bash
docker compose exec biblio_parser python -c "import os,psycopg2; psycopg2.connect(host='db', port=5432, dbname=os.environ['DB_NAME'], user=os.environ['DB_USER'], password=os.environ['DB_PASSWORD']); print('ok')"
```

Данные базы лежат в томе `coursework_pgdata` и сохраняются после `docker compose stop` и `docker rm coursework-db`. Скачанные файлы — в томе `coursework_downloads`.

## Резервная копия и восстановление

```bash
./scripts/backup.sh
./scripts/restore.sh backups/coursework_YYYYMMDD_HHMMSS.sql
```

Проверка, что данные переживают удаление тома:

```bash
./scripts/backup.sh backups/before.sql
docker compose down
docker volume rm coursework_pgdata
docker compose up -d
./scripts/restore.sh backups/before.sql
curl http://127.0.0.1:18101/
```

`docker compose down` здесь останавливает только контейнеры курсовой. `biblio-db` остаётся как был.

## Логи

Сервисы пишут в stdout/stderr.

```bash
docker compose logs -f
docker compose logs db biblio_parser ai_service parser_agent
```

## Отказ базы

```bash
docker stop coursework-db
curl http://127.0.0.1:18101/
docker start coursework-db
```

Пока базы нет, парсер отвечает, но в логе будет ошибка подключения. После старта том `coursework_pgdata` отдаёт те же данные.

## Размер образов

Итоговые образы собраны из `python:3.11-slim` в две стадии: компилятор и кэш pip в финальный слой не попадают. Для `ai_service` ставится CPU-сборка torch, без CUDA.

Собранные образы: `coursework-biblio-parser` 499 МБ, `coursework-parser-agent` 242 МБ, `coursework-ai-service` 1.79 ГБ. Полный образ `python:3.11` примерно на 600–700 МБ больше slim. CUDA-колесо torch обычно больше CPU-сборки на 1–2 ГБ. Актуальные размеры:

```bash
docker images coursework-biblio-parser coursework-ai-service coursework-parser-agent
```

## Если не стартует

| Симптом | Что сделать |
|---|---|
| `Не задана обязательная переменная` | Дописать ключ в `coursework/.env` и снова `docker compose up -d` |
| порт 18101 занят | Поменять `PARSER_PUBLISH_PORT` в `.env` |
| `coursework-db` healthy, парсер restart | `docker compose logs biblio_parser` — чаще всего база ещё не приняла расширение `vector`, тогда `docker compose down` и `docker volume rm coursework_pgdata`, затем поднять заново |
| агент отвечает 503 | парсер ещё не healthy: `docker compose ps` |
| образ ai собирается очень долго | это установка torch и sentence-transformers, повторная сборка берёт кэш |
