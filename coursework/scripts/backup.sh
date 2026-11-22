#!/usr/bin/env bash
# Резервная копия базы курсовой (контейнер coursework-db, не biblio-db).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

set -a
# shellcheck disable=SC1091
source .env
set +a

STAMP="$(date +%Y%m%d_%H%M%S)"
OUT="${1:-$ROOT/backups/coursework_${STAMP}.sql}"
mkdir -p "$(dirname "$OUT")"

if ! docker ps --format '{{.Names}}' | grep -qx coursework-db; then
  echo "Контейнер coursework-db не запущен. Сначала: docker compose up -d" >&2
  exit 1
fi

docker exec coursework-db pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists > "$OUT"
echo "Дамп записан: $OUT"
