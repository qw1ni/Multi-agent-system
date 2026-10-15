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
  STOP PARSING | ОСТАНОВИТЬ ПАРСИНГ
  SWARM | РОЙ                                        — состояние агентов роя
  DOWNLOAD ALL | СКАЧАТЬ ВСЕ
  DOWNLOAD SECTION <имя> | СКАЧАТЬ РАЗДЕЛ <имя>

Примеры:
  STATUS
  START PARSING
  DOWNLOAD SECTION ОКРБ 011-2009
  СКАЧАТЬ РАЗДЕЛ Факультеты
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
