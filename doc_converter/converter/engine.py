"""
Обёртка над Docling. Создаётся один раз на процесс: загрузка моделей дорогая,
а DocumentConverter не рассчитан на работу из нескольких потоков.
"""

import logging
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, field
from importlib import metadata
from pathlib import Path
from typing import List, Optional

from converter.config import ConverterConfig

logger = logging.getLogger(__name__)

SOFFICE_CANDIDATES = [
    "soffice",
    "libreoffice",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
]


@dataclass
class EngineResult:
    status: str  # success | partial | failed
    document: Optional[object] = None  # docling_core DoclingDocument
    pages: int = 0
    errors: List[str] = field(default_factory=list)


def _find_soffice() -> Optional[str]:
    for candidate in SOFFICE_CANDIDATES:
        found = shutil.which(candidate) or (candidate if Path(candidate).is_file() else None)
        if found:
            return found
    return None


class DoclingEngine:
    name = "docling"

    def __init__(self, config: ConverterConfig):
        self.config = config
        self._converter = None

    @property
    def version(self) -> str:
        try:
            return metadata.version("docling")
        except metadata.PackageNotFoundError:
            return "unknown"

    def _build_converter(self):
        from docling.datamodel.accelerator_options import AcceleratorDevice, AcceleratorOptions
        from docling.datamodel.base_models import InputFormat
        from docling.datamodel.pipeline_options import EasyOcrOptions, PdfPipelineOptions
        from docling.document_converter import DocumentConverter, PdfFormatOption

        pdf_options = PdfPipelineOptions()
        pdf_options.do_table_structure = True
        pdf_options.do_ocr = self.config.ocr_enabled
        pdf_options.ocr_options = EasyOcrOptions(lang=self.config.ocr_langs)
        pdf_options.accelerator_options = AcceleratorOptions(
            device=AcceleratorDevice(self.config.device),
            num_threads=self.config.num_threads,
        )

        return DocumentConverter(
            allowed_formats=[InputFormat.PDF, InputFormat.DOCX],
            format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=pdf_options)},
        )

    @property
    def converter(self):
        if self._converter is None:
            logger.info("Загрузка моделей Docling (первый запуск может скачать их из интернета)...")
            self._converter = self._build_converter()
        return self._converter

    def convert(self, source: Path) -> EngineResult:
        if source.suffix.lower() == ".doc":
            return self._convert_legacy_doc(source)
        return self._convert_supported(source)

    def _convert_supported(self, source: Path) -> EngineResult:
        from docling.datamodel.base_models import ConversionStatus

        result = self.converter.convert(source, raises_on_error=False)
        errors = [getattr(e, "error_message", str(e)) for e in (result.errors or [])]

        if result.status == ConversionStatus.SUCCESS:
            status = "success"
        elif result.status == ConversionStatus.PARTIAL_SUCCESS:
            status = "partial"
        else:
            return EngineResult(status="failed", errors=errors or [f"Docling: {result.status}"])

        document = result.document
        return EngineResult(status=status, document=document, pages=document.num_pages(), errors=errors)

    def _convert_legacy_doc(self, source: Path) -> EngineResult:
        """Старый .doc Docling не читает: сначала LibreOffice переводит его в .docx."""
        soffice = _find_soffice()
        if not soffice:
            return EngineResult(
                status="failed",
                errors=["Формат .doc требует LibreOffice (brew install --cask libreoffice)"],
            )

        with tempfile.TemporaryDirectory(prefix="doc2docx-") as tmp:
            completed = subprocess.run(
                [soffice, "--headless", "--convert-to", "docx", "--outdir", tmp, str(source)],
                capture_output=True, text=True, timeout=300,
            )
            converted = Path(tmp) / f"{source.stem}.docx"
            if completed.returncode != 0 or not converted.exists():
                return EngineResult(
                    status="failed",
                    errors=[f"LibreOffice не смог сконвертировать .doc: {completed.stderr.strip()[:500]}"],
                )
            return self._convert_supported(converted)
