import base64
import io
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

from sentence_transformers import SentenceTransformer

from app.repositories.chunk_repository import ChunkRepository
from app.services.chunk_index_service import _pg_int_array

PLAYGROUND_SECTION = "playground"
MAX_CHARS = 480


def extract_text(filename: str, raw: bytes) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix in {".txt", ".md", ".csv"}:
        return raw.decode("utf-8", errors="replace")
    if suffix == ".docx":
        return _docx_text(raw)
    if suffix == ".pdf":
        return _pdf_text(raw)
    raise ValueError("Поддерживаются PDF, DOCX, TXT и Markdown")


def _docx_text(raw: bytes) -> str:
    w = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    with zipfile.ZipFile(io.BytesIO(raw)) as zf:
        root = ET.fromstring(zf.read("word/document.xml"))
    paras = []
    for para in root.iter(f"{w}p"):
        t = "".join((n.text or "") for n in para.iter(f"{w}t"))
        t = re.sub(r"\s+", " ", t).strip()
        if t:
            paras.append(t)
    return "\n".join(paras)


def _pdf_text(raw: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise ValueError("Для PDF нужен пакет pypdf") from exc
    reader = PdfReader(io.BytesIO(raw))
    pages = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return "\n".join(pages)


def split_chunks(text: str) -> list:
    parts = re.split(r"\n\s*\n|(?<=[.!?])\s+(?=[А-ЯA-Z])", text)
    chunks = []
    buf = ""
    for part in parts:
        piece = re.sub(r"\s+", " ", part).strip()
        if len(piece) < 8:
            continue
        if buf and len(buf) + len(piece) > MAX_CHARS:
            chunks.append(buf)
            buf = piece
        else:
            buf = f"{buf} {piece}".strip() if buf else piece
    if buf:
        chunks.append(buf)
    return chunks


class PlaygroundIngestService:
    def __init__(self, repo: ChunkRepository, model: SentenceTransformer):
        self.repo = repo
        self.model = model

    def ingest_base64(self, filename: str, content_b64: str) -> dict:
        raw = base64.b64decode(content_b64)
        text = extract_text(filename, raw)
        text = text.strip()
        if len(text) < 40:
            raise ValueError(
                "В файле почти нет текста. Для сканов сначала нужна конвертация Docling."
            )
        pieces = split_chunks(text)
        if not pieces:
            raise ValueError("Не удалось нарезать текст на фрагменты")
        stem = Path(filename).stem.replace(" ", "_")[:80]
        doc_id = f"{PLAYGROUND_SECTION}/{stem}"
        self.repo.delete_by_doc_id(doc_id)
        vectors = self.model.encode(pieces, show_progress_bar=False)
        rows = []
        for i, (piece, vector) in enumerate(zip(pieces, vectors)):
            rows.append((
                f"{doc_id}#{i}",
                None,
                doc_id,
                PLAYGROUND_SECTION,
                filename,
                i,
                None,
                _pg_int_array([]),
                None,
                None,
                False,
                piece,
                str(vector.tolist()),
            ))
        self.repo.upsert_batch(rows)
        return {
            "filename": filename,
            "doc_id": doc_id,
            "chars": len(text),
            "chunks": len(rows),
            "section": PLAYGROUND_SECTION,
        }
