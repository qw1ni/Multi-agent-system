"""Облачная LLM по API-ключу. Локальные модели не используются.

Порядок:
  1. OPENROUTER_API_KEY  — https://openrouter.ai/keys
  2. GEMINI_API_KEY      — https://aistudio.google.com/apikey  (Google-аккаунт)
  3. GROQ_API_KEY        — https://console.groq.com/keys
"""
from __future__ import annotations

import json
import logging
import os
import re
from typing import List, Optional, Tuple

import requests

logger = logging.getLogger(__name__)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

OPENROUTER_MODEL = "google/gemma-4-31b-it:free"
OPENROUTER_FALLBACKS = [
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
    "openrouter/free",
]
GEMINI_MODEL = "gemini-3.8-flash"
GROQ_MODEL = "llama-3.3-70b-versatile"


def _strip(name: str) -> str:
    return (os.getenv(name) or "").strip()


def provider() -> Optional[str]:
    if _strip("OPENROUTER_API_KEY") or _strip("RPD_LLM_API_KEY"):
        return "openrouter"
    if _strip("GEMINI_API_KEY") or _strip("GOOGLE_API_KEY"):
        return "gemini"
    if _strip("GROQ_API_KEY"):
        return "groq"
    return None


def configured() -> bool:
    return provider() is not None


def _route() -> Optional[Tuple[str, str, dict, list]]:
    kind = provider()
    if kind == "openrouter":
        key = _strip("OPENROUTER_API_KEY") or _strip("RPD_LLM_API_KEY")
        model = _strip("OPENROUTER_MODEL") or _strip("RPD_LLM_MODEL") or OPENROUTER_MODEL
        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", "https://github.com/qw1ni/Multi-agent-system"),
            "X-Title": os.getenv("OPENROUTER_APP_NAME", "IAS BRU"),
        }
        extras = [m for m in OPENROUTER_FALLBACKS if m != model] if model.endswith(":free") or model == "openrouter/free" else []
        return OPENROUTER_URL, model, headers, extras
    if kind == "gemini":
        key = _strip("GEMINI_API_KEY") or _strip("GOOGLE_API_KEY")
        model = _strip("GEMINI_MODEL") or GEMINI_MODEL
        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }
        return GEMINI_URL, model, headers, []
    if kind == "groq":
        key = _strip("GROQ_API_KEY")
        model = _strip("GROQ_MODEL") or GROQ_MODEL
        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }
        return GROQ_URL, model, headers, []
    return None


def _parse_json(content: str) -> dict:
    text = (content or "").strip()
    fence = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.S)
    if fence:
        text = fence.group(1)
    start, end = text.find("{"), text.rfind("}")
    if start >= 0 and end > start:
        text = text[start : end + 1]
    return json.loads(text)


def _post(url: str, payload: dict, headers: dict, timeout: int) -> dict:
    resp = requests.post(url, json=payload, headers=headers, timeout=timeout)
    if resp.status_code == 400 and "response_format" in payload:
        payload = dict(payload)
        payload.pop("response_format", None)
        resp = requests.post(url, json=payload, headers=headers, timeout=timeout)
    if resp.status_code >= 400:
        logger.error("LLM API %s %s: %s", url, resp.status_code, resp.text[:800])
        resp.raise_for_status()
    return resp.json()


def chat_json(
    system: str,
    user: str,
    *,
    temperature: float = 0,
    timeout: int = 300,
) -> Optional[dict]:
    route = _route()
    if not route:
        return None
    url, model, headers, extras = route
    payload = {
        "model": model,
        "temperature": temperature,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "response_format": {"type": "json_object"},
    }
    if extras:
        payload["models"] = extras
    data = _post(url, payload, headers, timeout)
    return _parse_json(data["choices"][0]["message"]["content"])


def chat_text(
    messages: List[dict],
    *,
    temperature: float = 0.2,
    timeout: int = 120,
) -> Optional[str]:
    route = _route()
    if not route:
        return None
    url, model, headers, extras = route
    payload = {"model": model, "temperature": temperature, "messages": messages}
    if extras:
        payload["models"] = extras
    data = _post(url, payload, headers, timeout)
    return data["choices"][0]["message"]["content"]
