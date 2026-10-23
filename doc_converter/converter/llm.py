"""
Слой данных для LLM: из DoclingDocument делаем то, что потом скармливается моделям.

  document.md   — очищенный Markdown целиком (для длинного контекста и чтения человеком)
  chunks.jsonl  — смысловые куски по структуре документа (заголовки, абзацы, таблицы),
                  каждый со ссылкой на материал, страницы и цепочку заголовков:
                    text               — показывать LLM и цитировать
                    text_for_embedding — то же с заголовками раздела, для векторизации
  quality       — признаки, по которым пайплайн отсеивает мусор (пустые сканы и т.п.)

Размер чанка меряется токенизатором модели эмбеддингов: длиннее её окна — хвост
молча теряется при векторизации. Соседние чанки связаны через chunk_index, так что
при ответе LLM контекст расширяется соседями, а не увеличением чанка.
"""

import logging
import re
import unicodedata
from dataclasses import dataclass, field
from typing import List

from converter.config import ConverterConfig
from converter.tasks import ConversionTask

logger = logging.getLogger(__name__)

# Мягкие переносы и невидимые символы из PDF: съедают токены и ломают поиск по словам
_INVISIBLE = dict.fromkeys(map(ord, "\u00ad\u200b\u200c\u200d\u2060\ufeff"), None)
# «преобразова- ние» — перенос строки из PDF, склеенный Docling через пробел
_BROKEN_HYPHENATION = re.compile(r"(?<=[а-яё])- (?=[а-яё])")
_TRAILING_SPACES = re.compile(r"[ \t]+\n")
_EXTRA_BLANK_LINES = re.compile(r"\n{3,}")

MIN_DOC_CHARS = 200
LOW_TEXT_CHARS_PER_PAGE = 300


def normalize_text(text: str) -> str:
    text = unicodedata.normalize("NFC", text).translate(_INVISIBLE)
    text = text.replace("\r\n", "\n").replace("\u00a0", " ")
    text = _BROKEN_HYPHENATION.sub("", text)
    text = _TRAILING_SPACES.sub("\n", text)
    return _EXTRA_BLANK_LINES.sub("\n\n", text).strip()


@dataclass
class LlmPayload:
    markdown: str
    chunks: List[dict]
    stats: dict
    quality: dict
    warnings: List[str] = field(default_factory=list)


def _markdown_tables_provider():
    """Таблицы в чанках — Markdown-таблицами: LLM читает их лучше, чем «строка, столбец = значение»."""
    from docling_core.transforms.chunker.hierarchical_chunker import (
        ChunkingDocSerializer,
        ChunkingSerializerProvider,
    )
    from docling_core.transforms.serializer.markdown import MarkdownTableSerializer

    class MarkdownTablesProvider(ChunkingSerializerProvider):
        def get_serializer(self, doc):
            return ChunkingDocSerializer(doc=doc, table_serializer=MarkdownTableSerializer())

    return MarkdownTablesProvider()


class LlmPreparer:
    """Один на процесс агента: токенизатор загружается лениво при первом документе."""

    def __init__(self, config: ConverterConfig):
        self.config = config
        self._chunker = None

    @property
    def chunker(self):
        if self._chunker is None:
            from docling_core.transforms.chunker.hybrid_chunker import HybridChunker
            from docling_core.transforms.chunker.tokenizer.huggingface import HuggingFaceTokenizer

            tokenizer = HuggingFaceTokenizer.from_pretrained(
                model_name=self.config.chunk_tokenizer,
                max_tokens=self.config.chunk_max_tokens,
            )
            self._chunker = HybridChunker(
                tokenizer=tokenizer,
                merge_peers=True,
                serializer_provider=_markdown_tables_provider(),
            )
        return self._chunker

    def prepare(self, task: ConversionTask, document, source_sha256: str) -> LlmPayload:
        markdown = normalize_text(document.export_to_markdown())
        warnings = []
        try:
            chunks = self._chunks(task, document, source_sha256)
        except Exception as e:
            logger.exception(f"Не удалось нарезать {task.doc_id} на чанки")
            chunks = []
            warnings.append(f"Чанки не построены: {type(e).__name__}: {e}")

        pages = document.num_pages()
        tokens = [chunk["tokens"] for chunk in chunks]
        stats = {
            "pages": pages,
            "markdown_chars": len(markdown),
            "chars_per_page": round(len(markdown) / pages) if pages else None,
            "tables": len(document.tables),
            "pictures": len(document.pictures),
            "chunks": len(chunks),
            "tokens": sum(tokens),
            "max_chunk_tokens": max(tokens, default=0),
        }

        flags = []
        if len(markdown) < MIN_DOC_CHARS:
            flags.append("empty")
            warnings.append("Текста почти нет — вероятно, скан без OCR или пустой файл")
        elif pages and stats["chars_per_page"] < LOW_TEXT_CHARS_PER_PAGE:
            flags.append("low_text")
            warnings.append(f"Мало текста на страницу ({stats['chars_per_page']} симв.) — "
                            f"возможно, скан или документ из одних картинок")
        if not chunks:
            flags.append("no_chunks")
        quality = {
            "llm_ready": not {"empty", "no_chunks"} & set(flags),
            "flags": flags,
            "ocr_enabled": self.config.ocr_enabled,
        }
        return LlmPayload(markdown=markdown, chunks=chunks, stats=stats, quality=quality, warnings=warnings)

    def _chunks(self, task: ConversionTask, document, source_sha256: str) -> List[dict]:
        chunker = self.chunker
        records = []
        for chunk in chunker.chunk(dl_doc=document):
            text = normalize_text(chunk.text)
            if not text:
                continue
            text_for_embedding = normalize_text(chunker.contextualize(chunk=chunk))
            items = chunk.meta.doc_items or []
            records.append({
                "id": f"{task.doc_id}#{len(records)}",
                "doc_id": task.doc_id,
                "material_id": task.material_id,
                "section": task.section,
                "source_file": task.source.name,
                "source_sha256": source_sha256,
                "chunk_index": len(records),
                "headings": [normalize_text(h) for h in (chunk.meta.headings or [])],
                "pages": sorted({prov.page_no for item in items for prov in (item.prov or [])}),
                "labels": sorted({str(getattr(item.label, "value", item.label)) for item in items}),
                "text": text,
                "text_for_embedding": text_for_embedding,
                "tokens": chunker.tokenizer.count_tokens(text_for_embedding),
            })
        for record in records:
            record["chunks_total"] = len(records)
        return records
