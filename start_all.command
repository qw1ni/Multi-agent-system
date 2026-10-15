#!/usr/bin/env bash
# Двойной клик в Finder → запуск ИАС в Терминале
cd "$(dirname "$0")"
./start_all.sh start
echo
read -n 1 -s -r -p "Нажми любую клавишу, чтобы закрыть окно..."
