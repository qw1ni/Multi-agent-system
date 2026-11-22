#!/usr/bin/env bash
# Восстановление базы курсовой из дампа. Общий контейнер biblio-db не затрагивается.
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Использование: ./scripts/restore.sh backups/coursework_YYYYMMDD_HHMMSS.sql" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
DUMP="$1"
if [[ ! -f "$DUMP" ]]; then
  echo "Файл не найден: $DUMP" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if ! docker ps --format '{{.Names}}' | grep -qx coursework-db; then
  echo "Контейнер coursework-db не запущен. Сначала: docker compose up -d db" >&2
  exit 1
fi

docker exec -i coursework-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 < "$DUMP"
echo "База $POSTGRES_DB восстановлена из $DUMP"
