# Модуль мультиагентной системы

Ветка для разработки агентов поверх ИАС учебно-методических материалов.

## Агенты

| Агент | Назначение | Статус |
|--------|------------|--------|
| `parser_agent` | запуск и контроль сбора данных из электронной библиотеки | реализован |
| `orchestrator` | чат + формальный язык, делегирование агентам | реализован (пока → parser) |
| `analyst_agent` | анализ данных в БД (статистика, покрытие, аномалии) | планируется |
| `reporter_agent` | формирование отчётов (Excel / Word / PDF) | планируется |

## Parser Agent

Собственный агент **без LLM**: управляет уже существующим `biblio_parser` по HTTP.

### Подготовка

```bash
cd agents
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Сервис парсера должен быть запущен на `http://localhost:8001`.

### Команды

```bash
cd agents
source .venv/bin/activate

python -m parser_agent health      # доступен ли сервис
python -m parser_agent status      # идёт ли парсинг/скачивание
python -m parser_agent sections    # разделы и счётчики в БД
python -m parser_agent start       # запустить полный парсинг
python -m parser_agent download    # скачать все файлы
python -m parser_agent download --sections "ОКРБ 011-2009" "Факультеты"
```

### Использование из кода

```python
from parser_agent import ParserAgent

agent = ParserAgent()
print(agent.health().to_dict())
print(agent.start_parsing().to_dict())
print(agent.status().to_dict())
```

## Связь с основным проектом

- `../biblio_parser` — сервис парсинга
- `../server` — backend ИАС
- `../ai_service` — AI-сервис
- `../client` — интерфейс

Разработка ведётся в ветке `agents`, в `main` попадает после проверки.
