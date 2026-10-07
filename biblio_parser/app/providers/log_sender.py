import os
import requests
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class LogSender:
    def __init__(self):
        self.node_url = f'{os.getenv("MAIN_SERVER_URL")}{os.getenv("MAIN_SERVER_LOGS_ENDPOINT")}'

    def send_log(self, message: str, level: str = "INFO"):
        payload = {
            "level": level,
            "message": message,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        try:
            requests.post(self.node_url, json=payload, timeout=1.5)
        except Exception as e:
            logger.error(f"[LogSender Error] Не удалось доставить лог на Node.js: {e}")
