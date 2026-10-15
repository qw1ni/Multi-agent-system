"""
CLI конвертера документов (PDF / DOCX / DOC → Markdown + JSON).

Примеры (из папки doc_converter):
  python -m converter status
  python -m converter run
  python -m converter run --sections "ОКРБ 011-2009" --limit 5
  python -m converter run --force
"""

import argparse
import json
import logging
import sys
from collections import Counter
from pathlib import Path

_PACKAGE_ROOT = Path(__file__).resolve().parents[1]
if str(_PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(_PACKAGE_ROOT))

from converter.config import ConverterConfig  # noqa: E402
from converter.tasks import discover_tasks, section_stats  # noqa: E402


def cmd_status(config: ConverterConfig, sections) -> int:
    per_section = section_stats(config, sections)

    print(f"Исходники:  {config.download_dir}")
    print(f"Результаты: {config.converted_dir}\n")
    if not per_section:
        print("Файлов для конвертации не найдено")
        return 0
    total = Counter()
    for section, counts in sorted(per_section.items()):
        total.update(counts)
        print(f"{section:<20} " + ", ".join(f"{k}: {v}" for k, v in sorted(counts.items())))
    print(f"\n{'Итого':<20} " + ", ".join(f"{k}: {v}" for k, v in sorted(total.items())))
    return 0


def cmd_run(config: ConverterConfig, sections, limit, force) -> int:
    from converter.engine import DoclingEngine
    from converter.service import ConversionService

    tasks = discover_tasks(config, sections)
    service = ConversionService(DoclingEngine(config))
    summary = service.run(tasks, force=force, limit=limit)
    print(json.dumps(summary, ensure_ascii=False))
    return 1 if summary["failed"] else 0


def main(argv=None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    parser = argparse.ArgumentParser(description="Конвертация PDF/DOCX/DOC в Markdown и JSON (Docling)")
    parser.add_argument("action", choices=["run", "status"], nargs="?", default="status")
    parser.add_argument("--sections", nargs="*", default=None, help="Только эти разделы")
    parser.add_argument("--limit", type=int, default=None, help="Сконвертировать не больше N файлов")
    parser.add_argument("--force", action="store_true", help="Переделать даже готовые")
    parser.add_argument("--no-ocr", action="store_true", help="Не распознавать сканы (быстрее)")
    args = parser.parse_args(argv)

    config = ConverterConfig()
    if args.no_ocr:
        config.ocr_enabled = False

    if args.action == "status":
        return cmd_status(config, args.sections)
    return cmd_run(config, args.sections, args.limit, args.force)


if __name__ == "__main__":
    raise SystemExit(main())
