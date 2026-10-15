#!/usr/bin/env bash
# Двойной клик в Finder → остановка ИАС
cd "$(dirname "$0")"
./start_all.sh stop
echo
read -n 1 -s -r -p "Нажми любую клавишу, чтобы закрыть окно..."
