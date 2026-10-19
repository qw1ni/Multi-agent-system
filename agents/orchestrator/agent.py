"""
Orchestrator Agent — главный агент (пока управляет только parser_agent).

Принимает формальные команды из чата и делегирует их исполнителю.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict

_AGENTS_ROOT = Path(__file__).resolve().parents[1]
if str(_AGENTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_AGENTS_ROOT))

from parser_agent import ParserAgent
from orchestrator.formal_lang import HELP_TEXT, parse_formal_command, suggest_commands


class OrchestratorAgent:
    name = "orchestrator"
    role = "Главный агент: разбор формальных команд и делегирование"

    def __init__(self, parser_url: str | None = None):
        self.parser = ParserAgent(base_url=parser_url)

    def chat(self, message: str) -> Dict[str, Any]:
        command = parse_formal_command(message)

        if command.intent == "empty":
            return self._reply(
                False,
                "Пустая команда. Введите HELP для списка команд.",
                command.intent,
                suggestions=suggest_commands(),
            )

        if command.intent == "help":
            return self._reply(True, HELP_TEXT, command.intent, suggestions=suggest_commands())

        if command.intent == "unknown":
            return self._reply(
                False,
                "Команда не распознана формальным языком.\n\n" + HELP_TEXT,
                command.intent,
                suggestions=suggest_commands(),
            )

        # Делегирование parser_agent
        if command.intent == "health":
            result = self.parser.health()
        elif command.intent == "status":
            result = self.parser.status()
        elif command.intent == "sections":
            result = self.parser.get_sections()
        elif command.intent == "start":
            result = self.parser.start_parsing(mode="full")
        elif command.intent == "start_new":
            result = self.parser.start_parsing(mode="incremental")
        elif command.intent == "start_sections":
            result = self.parser.start_parsing(mode="full", sections=command.args["sections"])
        elif command.intent == "start_new_sections":
            result = self.parser.start_parsing(mode="incremental", sections=command.args["sections"])
        elif command.intent == "stop":
            result = self.parser.stop_parsing()
        elif command.intent == "swarm":
            result = self.parser.status()
        elif command.intent == "download_all":
            result = self.parser.download_files(sections=None)
        elif command.intent == "download_section":
            section = command.args.get("section")
            result = self.parser.download_files(sections=[section] if section else None)
        else:
            return self._reply(False, f"Intent не реализован: {command.intent}", command.intent)

        text = self._format_parser_result(result.to_dict())
        return self._reply(
            result.ok,
            text,
            command.intent,
            data=result.to_dict(),
            delegated_to="parser_agent",
        )

    def _format_parser_result(self, payload: Dict[str, Any]) -> str:
        lines = [
            f"[{payload.get('agent', 'parser_agent')}] {payload.get('message', '')}",
        ]
        data = payload.get("data") or {}

        if "sections" in data:
            lines.append("")
            for section in data["sections"]:
                lines.append(
                    f"- {section.get('name')}: {section.get('materials_count', 0)} мат."
                )
            if "materials_with_files" in data:
                lines.append(f"\nВсего с файлами: {data['materials_with_files']}")

        if "parsing" in data or "downloading" in data:
            lines.append(
                f"parsing={data.get('parsing')} downloading={data.get('downloading')}"
            )

        swarm = data.get("swarm") or {}
        if swarm.get("agents"):
            lines.append("")
            lines.append("Рой агентов парсинга:")
            for agent in swarm["agents"]:
                stats = agent.get("stats") or {}
                lines.append(
                    f"- {agent.get('name')} [{agent.get('section')}]: {agent.get('state')}, "
                    f"записано {stats.get('saved', 0)}, уже в БД {stats.get('skipped_known', 0)}"
                )

        return "\n".join(lines).strip()

    def _reply(
        self,
        ok: bool,
        message: str,
        intent: str,
        data: Dict[str, Any] | None = None,
        suggestions: list | None = None,
        delegated_to: str | None = None,
    ) -> Dict[str, Any]:
        return {
            "ok": ok,
            "agent": self.name,
            "intent": intent,
            "delegated_to": delegated_to,
            "message": message,
            "data": data or {},
            "suggestions": suggestions or [],
        }
