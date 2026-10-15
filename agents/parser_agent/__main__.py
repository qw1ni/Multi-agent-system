"""
CLI для Parser Agent.

Примеры:
  python -m parser_agent health
  python -m parser_agent status
  python -m parser_agent sections
  python -m parser_agent start
  python -m parser_agent start-new
  python -m parser_agent stop
  python -m parser_agent download
  python -m parser_agent download --sections "ОКРБ 011-2009" "Факультеты"
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Позволяет запускать как `python -m parser_agent` из папки agents/
_AGENTS_ROOT = Path(__file__).resolve().parents[1]
if str(_AGENTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_AGENTS_ROOT))

from parser_agent.agent import ParserAgent  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Parser Agent — управление biblio_parser")
    parser.add_argument(
        "action",
        nargs="?",
        default="status",
        choices=["health", "status", "sections", "start", "start-new", "stop", "download"],
        help="Действие агента",
    )
    parser.add_argument(
        "--sections",
        nargs="*",
        default=None,
        help="Разделы для download (если не указаны — все)",
    )
    parser.add_argument(
        "--url",
        default=None,
        help="URL сервиса парсера (по умолчанию PARSER_SERVER_URL или http://localhost:8001)",
    )
    args = parser.parse_args(argv)

    agent = ParserAgent(base_url=args.url)
    result = agent.run(action=args.action, sections=args.sections)
    print(json.dumps(result.to_dict(), ensure_ascii=False, indent=2))
    return 0 if result.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
