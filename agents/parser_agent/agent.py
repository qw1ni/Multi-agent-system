"""
Parser Agent — агент сбора данных электронной библиотеки.

Не парсит HTML сам: управляет существующим сервисом biblio_parser через HTTP API.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv

load_dotenv()


@dataclass
class AgentResult:
    ok: bool
    action: str
    message: str
    data: Dict[str, Any] = field(default_factory=dict)
    timestamp: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "ok": self.ok,
            "action": self.action,
            "message": self.message,
            "data": self.data,
            "timestamp": self.timestamp,
            "agent": "parser_agent",
        }


class ParserAgent:
    """Агент-оркестратор парсинга: health / start / status / sections / download."""

    name = "parser_agent"
    role = "Сбор и контроль данных электронной библиотеки"

    def __init__(self, base_url: Optional[str] = None, timeout: float = 30.0):
        self.base_url = (base_url or os.getenv("PARSER_SERVER_URL", "http://localhost:8001")).rstrip("/")
        self.timeout = timeout
        self._last_result: Optional[AgentResult] = None

    @property
    def last_result(self) -> Optional[AgentResult]:
        return self._last_result

    def _remember(self, result: AgentResult) -> AgentResult:
        self._last_result = result
        return result

    def _request(self, method: str, path: str, **kwargs) -> requests.Response:
        url = f"{self.base_url}{path}"
        return requests.request(method, url, timeout=self.timeout, **kwargs)

    def health(self) -> AgentResult:
        """Проверяет, доступен ли сервис парсера."""
        try:
            response = self._request("GET", "/")
            response.raise_for_status()
            payload = response.json() if response.content else {}
            return self._remember(AgentResult(
                ok=True,
                action="health",
                message="Сервис парсера доступен",
                data={"base_url": self.base_url, "response": payload},
            ))
        except requests.RequestException as exc:
            return self._remember(AgentResult(
                ok=False,
                action="health",
                message=f"Сервис парсера недоступен: {exc}",
                data={"base_url": self.base_url},
            ))

    def status(self) -> AgentResult:
        """Текущее состояние: идёт ли парсинг / скачивание."""
        try:
            response = self._request("GET", "/api/parser/status")
            response.raise_for_status()
            payload = response.json()
            parsing = bool(payload.get("parsing"))
            downloading = bool(payload.get("downloading"))
            swarm = payload.get("swarm") or {}
            if parsing:
                agents = swarm.get("agents") or []
                running = sum(1 for a in agents if a.get("state") == "running")
                message = f"Рой парсинга работает: активных агентов {running} из {len(agents)}"
            elif downloading:
                message = "Скачивание файлов выполняется"
            else:
                message = "Парсер простаивает"
            return self._remember(AgentResult(
                ok=True,
                action="status",
                message=message,
                data=payload,
            ))
        except requests.RequestException as exc:
            return self._remember(AgentResult(
                ok=False,
                action="status",
                message=f"Не удалось получить статус: {exc}",
                data={},
            ))

    def get_sections(self) -> AgentResult:
        """Список разделов и число материалов с file_link в БД."""
        try:
            response = self._request("GET", "/api/parser/sections")
            response.raise_for_status()
            payload = response.json()
            sections = payload.get("sections") or []
            total = sum(int(s.get("materials_count") or 0) for s in sections)
            return self._remember(AgentResult(
                ok=True,
                action="get_sections",
                message=f"Найдено разделов: {len(sections)}, материалов с файлами: {total}",
                data={"sections": sections, "materials_with_files": total},
            ))
        except requests.RequestException as exc:
            return self._remember(AgentResult(
                ok=False,
                action="get_sections",
                message=f"Не удалось получить разделы: {exc}",
                data={},
            ))

    def start_parsing(self, mode: str = "full") -> AgentResult:
        """Запускает рой парсинга: full — с нуля, incremental — только новые материалы."""
        try:
            response = self._request("POST", "/api/parser/start", json={"mode": mode})
            response.raise_for_status()
            payload = response.json()
            status = payload.get("status")
            ok = status in ("accepted", "busy")
            return self._remember(AgentResult(
                ok=ok,
                action="start_parsing",
                message=payload.get("message") or "Запрос на парсинг отправлен",
                data={**payload, "mode": mode},
            ))
        except requests.RequestException as exc:
            return self._remember(AgentResult(
                ok=False,
                action="start_parsing",
                message=f"Не удалось запустить парсинг: {exc}",
                data={"mode": mode},
            ))

    def stop_parsing(self) -> AgentResult:
        """Останавливает рой парсинга."""
        try:
            response = self._request("POST", "/api/parser/stop")
            response.raise_for_status()
            payload = response.json()
            return self._remember(AgentResult(
                ok=payload.get("status") in ("accepted", "idle"),
                action="stop_parsing",
                message=payload.get("message") or "Запрос на остановку отправлен",
                data=payload,
            ))
        except requests.RequestException as exc:
            return self._remember(AgentResult(
                ok=False,
                action="stop_parsing",
                message=f"Не удалось остановить парсинг: {exc}",
                data={},
            ))

    def download_files(self, sections: Optional[List[str]] = None) -> AgentResult:
        """Запускает скачивание файлов (все или выбранные разделы)."""
        try:
            response = self._request(
                "POST",
                "/api/parser/download_files",
                json={"sections": sections},
            )
            response.raise_for_status()
            payload = response.json()
            status = payload.get("status")
            ok = status in ("accepted", "busy")
            return self._remember(AgentResult(
                ok=ok,
                action="download_files",
                message=payload.get("message") or "Запрос на скачивание отправлен",
                data={**payload, "requested_sections": sections},
            ))
        except requests.RequestException as exc:
            return self._remember(AgentResult(
                ok=False,
                action="download_files",
                message=f"Не удалось запустить скачивание: {exc}",
                data={"requested_sections": sections},
            ))

    def run(self, action: str = "status", sections: Optional[List[str]] = None) -> AgentResult:
        """Единая точка входа для оркестратора."""
        action = (action or "status").strip().lower()
        if action in ("health", "ping"):
            return self.health()
        if action == "status":
            return self.status()
        if action in ("sections", "get_sections"):
            return self.get_sections()
        if action in ("start", "start_parsing", "parse"):
            return self.start_parsing(mode="full")
        if action in ("start-new", "start_new", "parse_new", "incremental"):
            return self.start_parsing(mode="incremental")
        if action in ("stop", "stop_parsing"):
            return self.stop_parsing()
        if action in ("download", "download_files"):
            return self.download_files(sections=sections)
        return self._remember(AgentResult(
            ok=False,
            action=action,
            message=f"Неизвестное действие: {action}. "
                    f"Доступны: health, status, sections, start, start-new, stop, download",
            data={},
        ))
