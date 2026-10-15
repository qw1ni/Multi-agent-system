#!/usr/bin/env bash
# Запуск ИАС по очереди: Docker БД → парсер → оркестратор → конвертер → Node → React-клиент
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PARSER_DIR="$ROOT/biblio_parser"
SERVER_DIR="$ROOT/server"
CLIENT_DIR="$ROOT/client/ias_university_materials"
AGENTS_DIR="$ROOT/agents"
CONVERTER_DIR="$ROOT/doc_converter"

DB_CONTAINER="biblio-db"
DB_PORT=5433
PARSER_PORT=8001
ORCH_PORT=8003
CONVERTER_PORT=8004
SERVER_PORT=5001
CLIENT_PORT=3000

PIDS_FILE="$ROOT/.run_pids"
LOG_DIR="$ROOT/.run_logs"
mkdir -p "$LOG_DIR"

RED=$'\033[0;31m'
GREEN=$'\033[0;32m'
YELLOW=$'\033[1;33m'
NC=$'\033[0m'

log()  { echo "${GREEN}[ok]${NC} $*"; }
warn() { echo "${YELLOW}[!]${NC} $*"; }
err()  { echo "${RED}[err]${NC} $*" >&2; }

wait_port() {
  local port="$1" name="$2" tries="${3:-60}"
  local i=0
  while (( i < tries )); do
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      log "$name слушает порт $port"
      return 0
    fi
    sleep 1
    ((i++)) || true
  done
  err "$name не поднялся на порту $port"
  return 1
}

ensure_docker() {
  if ! docker info >/dev/null 2>&1; then
    warn "Docker не запущен — открываю Docker Desktop..."
    open -a Docker || true
    local i=0
    while (( i < 40 )); do
      if docker info >/dev/null 2>&1; then
        log "Docker готов"
        break
      fi
      sleep 3
      ((i++)) || true
    done
    if ! docker info >/dev/null 2>&1; then
      err "Docker так и не стартовал. Запусти Docker Desktop вручную."
      exit 1
    fi
  fi
}

start_db() {
  ensure_docker
  if docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
    log "БД уже запущена ($DB_CONTAINER)"
  elif docker ps -a --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
    docker start "$DB_CONTAINER" >/dev/null
    log "БД контейнер запущен"
  else
    warn "Контейнер $DB_CONTAINER не найден — создаю..."
    docker run -d --name "$DB_CONTAINER" \
      -e POSTGRES_PASSWORD=postgres \
      -e POSTGRES_DB=university_library_db \
      -p "${DB_PORT}:5432" \
      pgvector/pgvector:pg18 >/dev/null
    sleep 3
    docker exec "$DB_CONTAINER" psql -U postgres -d university_library_db \
      -c "CREATE EXTENSION IF NOT EXISTS vector;" >/dev/null
    log "БД создана и запущена на порту $DB_PORT"
  fi
  wait_port "$DB_PORT" "PostgreSQL" 30
}

start_parser() {
  if lsof -nP -iTCP:"$PARSER_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    log "Парсер уже на порту $PARSER_PORT"
    return 0
  fi
  if [[ ! -x "$PARSER_DIR/.venv/bin/python" ]]; then
    err "Нет venv парсера: $PARSER_DIR/.venv"
    err "Сначала: cd biblio_parser && /usr/local/bin/python3.11 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt uvicorn httpx"
    exit 1
  fi
  (
    cd "$PARSER_DIR"
    nohup .venv/bin/python -m app.main >"$LOG_DIR/parser.log" 2>&1 &
    echo $! >>"$PIDS_FILE"
  )
  wait_port "$PARSER_PORT" "Парсер" 40
}

start_orchestrator() {
  if lsof -nP -iTCP:"$ORCH_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    log "Оркестратор уже на порту $ORCH_PORT"
    return 0
  fi
  if [[ ! -x "$AGENTS_DIR/.venv/bin/python" ]]; then
    warn "Создаю venv для agents..."
    /usr/local/bin/python3.11 -m venv "$AGENTS_DIR/.venv"
    "$AGENTS_DIR/.venv/bin/pip" install -r "$AGENTS_DIR/requirements.txt"
  fi
  if [[ ! -f "$AGENTS_DIR/.env" && -f "$AGENTS_DIR/.env.example" ]]; then
    cp "$AGENTS_DIR/.env.example" "$AGENTS_DIR/.env"
  fi
  (
    cd "$AGENTS_DIR"
    # 127.0.0.1: на macOS localhost часто резолвится в ::1, а сервис слушает IPv4
    ORCHESTRATOR_HOST=127.0.0.1 ORCHESTRATOR_PORT="$ORCH_PORT" \
      nohup .venv/bin/python -m orchestrator.server >"$LOG_DIR/orchestrator.log" 2>&1 &
    echo $! >>"$PIDS_FILE"
  )
  wait_port "$ORCH_PORT" "Оркестратор" 40
}

start_converter() {
  if lsof -nP -iTCP:"$CONVERTER_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    log "Конвертер уже на порту $CONVERTER_PORT"
    return 0
  fi
  if [[ ! -x "$CONVERTER_DIR/.venv/bin/python" ]]; then
    warn "Нет venv конвертера — пропускаю. Установка: cd doc_converter && /usr/local/bin/python3.11 -m venv .venv && .venv/bin/pip install -r requirements.txt"
    return 0
  fi
  if [[ ! -f "$CONVERTER_DIR/.env" && -f "$CONVERTER_DIR/.env.example" ]]; then
    cp "$CONVERTER_DIR/.env.example" "$CONVERTER_DIR/.env"
  fi
  (
    cd "$CONVERTER_DIR"
    CONVERTER_HOST=127.0.0.1 CONVERTER_PORT="$CONVERTER_PORT" \
      nohup .venv/bin/python -m converter.server >"$LOG_DIR/converter.log" 2>&1 &
    echo $! >>"$PIDS_FILE"
  )
  wait_port "$CONVERTER_PORT" "Конвертер" 60
}

start_server() {
  if lsof -nP -iTCP:"$SERVER_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    log "Node-сервер уже на порту $SERVER_PORT"
    return 0
  fi
  if [[ ! -d "$SERVER_DIR/node_modules" ]]; then
    warn "Ставлю зависимости server..."
    (cd "$SERVER_DIR" && npm install)
  fi
  (
    cd "$SERVER_DIR"
    nohup npm run dev >"$LOG_DIR/server.log" 2>&1 &
    echo $! >>"$PIDS_FILE"
  )
  wait_port "$SERVER_PORT" "Node-сервер" 40
}

start_client() {
  if lsof -nP -iTCP:"$CLIENT_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    log "Клиент уже на порту $CLIENT_PORT"
    return 0
  fi
  if [[ ! -d "$CLIENT_DIR/node_modules" ]]; then
    warn "Ставлю зависимости client..."
    (cd "$CLIENT_DIR" && npm install)
  fi
  (
    cd "$CLIENT_DIR"
    # BROWSER=none — не открывать окно само; откроем явно ниже
    nohup env BROWSER=none npm start >"$LOG_DIR/client.log" 2>&1 &
    echo $! >>"$PIDS_FILE"
  )
  wait_port "$CLIENT_PORT" "React-клиент" 90
}

start_all() {
  : >"$PIDS_FILE"
  echo "=== Запуск ИАС ==="
  start_db
  start_parser
  start_orchestrator
  start_converter
  start_server
  start_client
  echo
  log "Всё запущено:"
  echo "  UI:     http://localhost:$CLIENT_PORT"
  echo "  API:    http://localhost:$SERVER_PORT"
  echo "  Parser: http://localhost:$PARSER_PORT"
  echo "  Orch:   http://127.0.0.1:$ORCH_PORT"
  echo "  Conv:   http://127.0.0.1:$CONVERTER_PORT"
  echo "  DB:     localhost:$DB_PORT (docker: $DB_CONTAINER)"
  echo
  echo "Логи: $LOG_DIR/"
  echo "Остановка: $0 stop"
  open "http://localhost:$CLIENT_PORT" >/dev/null 2>&1 || true
}

stop_all() {
  echo "=== Остановка ==="
  for port in "$CLIENT_PORT" "$SERVER_PORT" "$CONVERTER_PORT" "$ORCH_PORT" "$PARSER_PORT"; do
    pids=$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)
    if [[ -n "${pids:-}" ]]; then
      kill $pids 2>/dev/null || true
      sleep 0.5
      kill -9 $pids 2>/dev/null || true
      log "Освобождён порт $port"
    fi
  done
  if [[ -f "$PIDS_FILE" ]]; then
    while read -r pid; do
      [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
    done <"$PIDS_FILE"
    rm -f "$PIDS_FILE"
  fi
  # дочерние node/react-scripts
  pkill -f "SidarenkoNA.PIR221.VKR.SourceCode/server" 2>/dev/null || true
  pkill -f "node --watch --watch-preserve-output --import dotenv/config src/server.js" 2>/dev/null || true
  pkill -f "ias_university_materials/node_modules/.bin/react-scripts" 2>/dev/null || true
  if docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
    docker stop "$DB_CONTAINER" >/dev/null
    log "Docker БД остановлена"
  fi
  log "Готово"
}

status_all() {
  echo "=== Статус ==="
  for item in "DB:$DB_PORT" "Parser:$PARSER_PORT" "Orch:$ORCH_PORT" "Conv:$CONVERTER_PORT" "Server:$SERVER_PORT" "Client:$CLIENT_PORT"; do
    name="${item%%:*}"
    port="${item##*:}"
    if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
      log "$name — UP (:$port)"
    else
      warn "$name — DOWN (:$port)"
    fi
  done
  if docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
    log "Docker $DB_CONTAINER — UP"
  else
    warn "Docker $DB_CONTAINER — DOWN"
  fi
}

parser_agent_cmd() {
  local action="${1:-status}"
  shift || true
  if [[ ! -x "$AGENTS_DIR/.venv/bin/python" ]]; then
    err "Сначала поставь зависимости агентов:"
    err "  cd agents && python3.11 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    exit 1
  fi
  (cd "$AGENTS_DIR" && .venv/bin/python -m parser_agent "$action" "$@")
}

convert_cmd() {
  local action="${1:-run}"
  shift || true
  if [[ ! -x "$CONVERTER_DIR/.venv/bin/python" ]]; then
    err "Сначала поставь зависимости конвертера:"
    err "  cd doc_converter && /usr/local/bin/python3.11 -m venv .venv && .venv/bin/pip install -r requirements.txt"
    exit 1
  fi
  if [[ ! -f "$CONVERTER_DIR/.env" && -f "$CONVERTER_DIR/.env.example" ]]; then
    cp "$CONVERTER_DIR/.env.example" "$CONVERTER_DIR/.env"
  fi
  (cd "$CONVERTER_DIR" && .venv/bin/python -m converter "$action" "$@")
}

usage() {
  cat <<EOF
Использование: $(basename "$0") <команда>

  start     запустить БД → парсер → оркестратор → конвертер → Node → клиент
  stop      остановить всё
  restart   stop + start
  status    показать, что запущено
  parse     запустить парсинг через parser_agent (нужен работающий парсер)
  sections  разделы через parser_agent
  convert   PDF/DOCX/DOC → Markdown + JSON (doc_converter, Docling)
  convert-status  сколько файлов сконвертировано

Примеры:
  ./start_all.sh start
  ./start_all.sh parse
  ./start_all.sh stop
EOF
}

cmd="${1:-start}"
shift || true

case "$cmd" in
  start)   start_all ;;
  stop)    stop_all ;;
  restart) stop_all; start_all ;;
  status)  status_all ;;
  parse)   parser_agent_cmd start "$@" ;;
  sections) parser_agent_cmd sections "$@" ;;
  convert) convert_cmd run "$@" ;;
  convert-status) convert_cmd status "$@" ;;
  health|status-agent) parser_agent_cmd status "$@" ;;
  -h|--help|help) usage ;;
  *) err "Неизвестная команда: $cmd"; usage; exit 1 ;;
esac
