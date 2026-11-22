"""Облачная LLM по API-ключу. Берёт ключ из ai_service/.env или doc_converter/.env."""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import List, Optional

import httpx
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(_ROOT / ".env")
load_dotenv(_ROOT.parent / "doc_converter" / ".env")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GEMINI_MODELS = [
    "gemini-3.8-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
]


def _strip(name: str) -> str:
    return (os.getenv(name) or "").strip()


def provider() -> Optional[str]:
    if _strip("OPENROUTER_API_KEY"):
        return "openrouter"
    if _strip("GEMINI_API_KEY") or _strip("GOOGLE_API_KEY"):
        return "gemini"
    if _strip("GROQ_API_KEY"):
        return "groq"
    return None


def configured() -> bool:
    return provider() is not None


def _openai_chat(url: str, headers: dict, model: str, messages: List[dict], timeout: float) -> str:
    payload = {"model": model, "temperature": 0.2, "messages": messages}
    with httpx.Client(timeout=timeout) as client:
        resp = client.post(url, json=payload, headers=headers)
        if resp.status_code >= 400:
            logger.error("LLM %s: %s", resp.status_code, resp.text[:800])
            resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


def _gemini_native(messages: List[dict], timeout: float) -> str:
    key = _strip("GEMINI_API_KEY") or _strip("GOOGLE_API_KEY")
    preferred = _strip("GEMINI_MODEL")
    models = [preferred] + [m for m in GEMINI_MODELS if m != preferred] if preferred else list(GEMINI_MODELS)
    system = "\n".join(m["content"] for m in messages if m["role"] == "system")
    user = "\n".join(m["content"] for m in messages if m["role"] != "system")
    body = {
        "contents": [{"role": "user", "parts": [{"text": user}]}],
    }
    if system:
        body["systemInstruction"] = {"parts": [{"text": system}]}
    last_error = None
    with httpx.Client(timeout=timeout) as client:
        for model in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            resp = client.post(url, params={"key": key}, json=body)
            if resp.status_code == 404:
                logger.warning("Gemini модель недоступна: %s", model)
                last_error = resp
                continue
            if resp.status_code >= 400:
                logger.error("Gemini %s %s: %s", model, resp.status_code, resp.text[:800])
                resp.raise_for_status()
            parts = resp.json().get("candidates", [{}])[0].get("content", {}).get("parts", [])
            text = "".join(p.get("text") or "" for p in parts).strip()
            if not text:
                raise RuntimeError("Gemini вернула пустой ответ")
            return text
    if last_error is not None:
        last_error.raise_for_status()
    raise RuntimeError("Нет доступной модели Gemini")


def chat_text(messages: List[dict], *, temperature: float = 0.2, timeout: float = 120) -> str:
    kind = provider()
    if kind == "gemini":
        return _gemini_native(messages, timeout)
    if kind == "openrouter":
        return _openai_chat(
            OPENROUTER_URL,
            {
                "Authorization": f"Bearer {_strip('OPENROUTER_API_KEY')}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/qw1ni/Multi-agent-system",
                "X-Title": "IAS BRU",
            },
            _strip("OPENROUTER_MODEL") or "google/gemma-4-31b-it:free",
            messages,
            timeout,
        )
    if kind == "groq":
        return _openai_chat(
            GROQ_URL,
            {"Authorization": f"Bearer {_strip('GROQ_API_KEY')}", "Content-Type": "application/json"},
            _strip("GROQ_MODEL") or "llama-3.3-70b-versatile",
            messages,
            timeout,
        )
    raise RuntimeError("Нет API-ключа облачной модели")
