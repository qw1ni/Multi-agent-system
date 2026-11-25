"""Если оркестратор (:8003) пропал — Gemini пишет текст, бот из telegram_token.txt шлёт его в Telegram."""
from __future__ import annotations

import json
import socket
import ssl
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TOKEN_FILE = ROOT / "telegram_token.txt"
CHAT_FILE = ROOT / "alert_chat.txt"
GEMINI_ENV = ROOT / "doc_converter" / ".env"
HOST, PORT = "127.0.0.1", 8003
CTX = ssl._create_unverified_context()


def _token() -> str:
    if not TOKEN_FILE.is_file():
        return ""
    return TOKEN_FILE.read_text(encoding="utf-8").strip().splitlines()[0].strip()


def _gemini_key() -> str:
    if not GEMINI_ENV.is_file():
        return ""
    for line in GEMINI_ENV.read_text(encoding="utf-8").splitlines():
        if line.startswith("GEMINI_API_KEY="):
            return line.split("=", 1)[1].strip()
    return ""


def _json(url: str, payload: dict | None = None, headers: dict | None = None) -> dict:
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers or {})
    with urllib.request.urlopen(req, timeout=25, context=CTX) as resp:
        return json.load(resp)


def _up() -> bool:
    try:
        with socket.create_connection((HOST, PORT), timeout=2):
            return True
    except OSError:
        return False


def _chat_id(token: str) -> str:
    if CHAT_FILE.is_file() and CHAT_FILE.read_text(encoding="utf-8").strip():
        return CHAT_FILE.read_text(encoding="utf-8").strip()
    data = _json(f"https://api.telegram.org/bot{token}/getUpdates")
    for update in reversed(data.get("result") or []):
        msg = update.get("message") or {}
        chat = (msg.get("chat") or {}).get("id")
        if chat:
            CHAT_FILE.write_text(str(chat), encoding="utf-8")
            return str(chat)
    return ""


def _text() -> str:
    fallback = "Оркестратор на порту 8003 не отвечает. Конвейер остановился."
    key = _gemini_key()
    if not key:
        return fallback
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent"
    body = {
        "contents": [{
            "role": "user",
            "parts": [{"text": "Одно короткое сообщение по-русски: процесс оркестратора упал, конвейер парсинга остановился. Без ключей."}],
        }]
    }
    try:
        data = _json(url, body, {"x-goog-api-key": key, "Content-Type": "application/json"})
        parts = data["candidates"][0]["content"]["parts"]
        return ("".join(p.get("text") or "" for p in parts).strip() or fallback)
    except Exception:
        return fallback


def _send(token: str, chat_id: str, text: str) -> None:
    _json(
        f"https://api.telegram.org/bot{token}/sendMessage",
        {"chat_id": chat_id, "text": text[:500]},
    )


def main() -> None:
    was_up = _up()
    while True:
        token = _token()
        up = _up()
        if token:
            try:
                _chat_id(token)
            except Exception:
                pass
        if was_up and not up and token:
            try:
                chat_id = _chat_id(token)
                if chat_id:
                    _send(token, chat_id, _text())
            except Exception as exc:
                print("не отправилось:", type(exc).__name__)
        was_up = up
        time.sleep(20)


if __name__ == "__main__":
    main()
