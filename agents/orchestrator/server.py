"""
HTTP API оркестратора (чат с формальным языком).

Порт по умолчанию: 8003
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel, Field
import uvicorn

_AGENTS_ROOT = Path(__file__).resolve().parents[1]
if str(_AGENTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_AGENTS_ROOT))

load_dotenv(_AGENTS_ROOT / ".env")

from orchestrator.agent import OrchestratorAgent  # noqa: E402

app = FastAPI(title="Orchestrator Agent API")
orchestrator = OrchestratorAgent(parser_url=os.getenv("PARSER_SERVER_URL"))


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Команда формального языка")


@app.get("/")
def root():
    return {"message": "Orchestrator agent API", "agent": "orchestrator"}


@app.get("/api/agent/help")
def help_endpoint():
    return orchestrator.chat("HELP")


@app.post("/api/agent/chat")
def chat_endpoint(body: ChatRequest):
    return orchestrator.chat(body.message)


if __name__ == "__main__":
    host = os.getenv("ORCHESTRATOR_HOST", "127.0.0.1")
    port = int(os.getenv("ORCHESTRATOR_PORT", "8003"))
    # reload=False: стабильнее при запуске через start_all / nohup
    uvicorn.run(app, host=host, port=port, reload=False)
