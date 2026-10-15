import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import List

import certifi
from dotenv import load_dotenv

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PACKAGE_ROOT / ".env")

# Python с python.org на macOS не видит системные сертификаты, а EasyOCR
# качает модели через urllib — без этого падает CERTIFICATE_VERIFY_FAILED
os.environ.setdefault("SSL_CERT_FILE", certifi.where())


def _path_from_env(name: str, default: str) -> Path:
    path = Path(os.getenv(name, default))
    return path if path.is_absolute() else (PACKAGE_ROOT / path).resolve()


@dataclass
class ConverterConfig:
    download_dir: Path = field(
        default_factory=lambda: _path_from_env("DOWNLOAD_DIR", "../biblio_parser/data/downloads"))
    converted_dir: Path = field(
        default_factory=lambda: _path_from_env("CONVERTED_DIR", "data/converted"))
    ocr_enabled: bool = field(
        default_factory=lambda: os.getenv("OCR_ENABLED", "true").lower() == "true")
    ocr_langs: List[str] = field(
        default_factory=lambda: [x.strip() for x in os.getenv("OCR_LANGS", "ru,en").split(",") if x.strip()])
    device: str = field(default_factory=lambda: os.getenv("DOCLING_DEVICE", "auto"))
    num_threads: int = field(default_factory=lambda: int(os.getenv("DOCLING_THREADS", "4")))
