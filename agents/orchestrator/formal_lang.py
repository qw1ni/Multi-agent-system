"""
Формальный (контролируемый) язык команд оркестратора.

Позже сюда же лягут команды analyst/reporter.
Сейчас поддерживается только parser_agent.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import List, Optional


@dataclass
class FormalCommand:
    intent: str
    args: dict
    raw: str


HELP_TEXT = """Формальный язык команд (пока только агент парсинга):

  HELP | ПОМОЩЬ
  HEALTH | ПРОВЕРКА
  STATUS | СТАТУС
  LIST SECTIONS | ПОКАЗАТЬ РАЗДЕЛЫ | РАЗДЕЛЫ
  START PARSING | ЗАПУСТИТЬ ПАРСИНГ | ПАРСИНГ        — рой агентов, с нуля
  START PARSING NEW | ПАРСИНГ НОВЫХ                  — рой агентов, только новые
  PARSE SECTION <имя>[, <имя>] | ПАРСИНГ РАЗДЕЛ <имя>             — с нуля, только эти разделы
  PARSE NEW SECTION <имя>[, <имя>] | ПАРСИНГ НОВЫХ РАЗДЕЛ <имя>   — только новые, только эти разделы
  STOP PARSING | ОСТАНОВИТЬ ПАРСИНГ
  SWARM | РОЙ                                        — состояние агентов роя
  DOWNLOAD ALL | СКАЧАТЬ ВСЕ
  DOWNLOAD SECTION <имя> | СКАЧАТЬ РАЗДЕЛ <имя>

Отдельный режим, не заменяет обычный парсинг:
  CYCLE [N] | КОНВЕЙЕР [N]          — по кругу: N новых с сайта, скачать N, сконвертировать N
  CYCLE STATUS | СТАТУС КОНВЕЙЕРА
  STOP CYCLE | СТОП КОНВЕЙЕР

Примеры:
  STATUS
  START PARSING
  ПАРСИНГ НОВЫХ РАЗДЕЛ Факультеты, РФ 3++, Конференции
  DOWNLOAD SECTION Авторефераты
  СКАЧАТЬ РАЗДЕЛ Факультеты
  КОНВЕЙЕР 30
"""


def normalize(text: str) -> str:
    text = (text or "").strip()
    text = re.sub(r"\s+", " ", text)
    return text


def parse_formal_command(text: str) -> FormalCommand:
    raw = text or ""
    cleaned = normalize(text)
    upper = cleaned.upper()

    if not cleaned:
        return FormalCommand(intent="empty", args={}, raw=raw)

    if upper in {"HELP", "ПОМОЩЬ", "?", "КОМАНДЫ"}:
        return FormalCommand(intent="help", args={}, raw=raw)

    if upper in {"HEALTH", "ПРОВЕРКА", "ПИНГ", "PING"}:
        return FormalCommand(intent="health", args={}, raw=raw)

    if upper in {"STATUS", "СТАТУС"}:
        return FormalCommand(intent="status", args={}, raw=raw)

    if upper in {
        "LIST SECTIONS",
        "SECTIONS",
        "ПОКАЗАТЬ РАЗДЕЛЫ",
        "РАЗДЕЛЫ",
        "СПИСОК РАЗДЕЛОВ",
    }:
        return FormalCommand(intent="sections", args={}, raw=raw)

    if upper in {
        "START PARSING",
        "START",
        "PARSE",
        "ЗАПУСТИТЬ ПАРСИНГ",
        "ПАРСИНГ",
        "ЗАПУСК ПАРСЕРА",
    }:
        return FormalCommand(intent="start", args={}, raw=raw)

    if upper in {
        "START PARSING NEW",
        "PARSE NEW",
        "ПАРСИНГ НОВЫХ",
        "ЗАПУСТИТЬ ПАРСИНГ НОВЫХ",
    }:
        return FormalCommand(intent="start_new", args={}, raw=raw)

    if upper in {"STOP PARSING", "STOP", "ОСТАНОВИТЬ ПАРСИНГ", "СТОП"}:
        return FormalCommand(intent="stop", args={}, raw=raw)

    if upper in {"SWARM", "РОЙ", "АГЕНТЫ", "СОСТОЯНИЕ РОЯ"}:
        return FormalCommand(intent="swarm", args={}, raw=raw)

    if upper in {"DOWNLOAD ALL", "DOWNLOAD", "СКАЧАТЬ ВСЕ", "СКАЧАТЬ"}:
        return FormalCommand(intent="download_all", args={}, raw=raw)

    m = re.match(
        r"^(?:PARSE(?P<new> NEW)? SECTIONS?|ПАРСИНГ(?P<new_ru> НОВЫХ)? РАЗДЕЛ(?:Ы|А)?)\s+(?P<names>.+)$",
        cleaned,
        flags=re.IGNORECASE,
    )
    if m:
        sections = [s.strip().strip("\"'") for s in m.group("names").split(",")]
        return FormalCommand(
            intent="start_new_sections" if (m.group("new") or m.group("new_ru")) else "start_sections",
            args={"sections": [s for s in sections if s]},
            raw=raw,
        )

    if upper in {"CYCLE STATUS", "СТАТУС КОНВЕЙЕРА", "КОНВЕЙЕР СТАТУС"}:
        return FormalCommand(intent="cycle_status", args={}, raw=raw)

    if upper in {"STOP CYCLE", "СТОП КОНВЕЙЕР", "ОСТАНОВИТЬ КОНВЕЙЕР"}:
        return FormalCommand(intent="cycle_stop", args={}, raw=raw)

    m = re.match(
        r"^(?:CYCLE|КОНВЕЙЕР|START CYCLE|ЗАПУСТИТЬ КОНВЕЙЕР)(?:\s+(?P<batch>\d+))?$",
        cleaned,
        flags=re.IGNORECASE,
    )
    if m:
        batch = int(m.group("batch")) if m.group("batch") else 30
        return FormalCommand(intent="cycle_start", args={"batch": batch}, raw=raw)

    m = re.match(
        r"^(?:DOWNLOAD SECTION|СКАЧАТЬ РАЗДЕЛ)\s+(.+)$",
        cleaned,
        flags=re.IGNORECASE,
    )
    if m:
        section = m.group(1).strip().strip("\"'")
        return FormalCommand(
            intent="download_section",
            args={"section": section},
            raw=raw,
        )

    return FormalCommand(intent="unknown", args={}, raw=raw)


def suggest_commands(limit: int = 6) -> List[str]:
    return [
        "HELP",
        "STATUS",
        "LIST SECTIONS",
        "START PARSING NEW",
        "SWARM",
        "STOP PARSING",
        "DOWNLOAD SECTION ОКРБ 011-2009",
    ][:limit]
