#!/bin/sh
set -eu

for var in ${REQUIRED_VARS:-}; do
  value=$(printenv "$var" 2>/dev/null || true)
  if [ -z "$value" ]; then
    echo "Не задана обязательная переменная окружения: $var" >&2
    exit 1
  fi
done

exec "$@"
