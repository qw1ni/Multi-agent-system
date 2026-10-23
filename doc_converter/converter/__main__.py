"""
CLI конвертера документов (PDF / DOCX / DOC → Markdown + JSON + чанки для LLM).

Конвертирует рой агентов: каждый агент — отдельный процесс со своим разделом
(большие разделы делятся на части между несколькими агентами).

Примеры (из папки doc_converter):
  python -m converter status
  python -m converter run
  python -m converter run --agents 3
  python -m converter run --sections "ОКРБ 011-2009" "Факультеты" --limit 5
  python -m converter run --force
  python -m converter manifest
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
    from converter.swarm import ConversionSwarm

    summary = ConversionSwarm(config).run(discover_tasks(config, sections), force=force, limit=limit)
    print(json.dumps(summary, ensure_ascii=False))
    return 1 if summary["failed"] else 0


def cmd_manifest(config: ConverterConfig) -> int:
    from converter.manifest import build_manifests

    print(json.dumps(build_manifests(config), ensure_ascii=False))
    return 0


def main(argv=None) -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

    parser = argparse.ArgumentParser(description="Конвертация PDF/DOCX/DOC в Markdown, JSON и чанки для LLM")
    parser.add_argument("action", choices=["run", "status", "manifest"], nargs="?", default="status")
    parser.add_argument("--sections", nargs="*", default=None, help="Только эти разделы")
    parser.add_argument("--limit", type=int, default=None, help="Взять не больше N файлов")
    parser.add_argument("--force", action="store_true", help="Переделать даже готовые")
    parser.add_argument("--no-ocr", action="store_true", help="Не распознавать сканы (быстрее)")
    parser.add_argument("--agents", type=int, default=None, help="Сколько агентов роя работают одновременно")
    parser.add_argument("--split", type=int, default=None,
                        help="Делить раздел на части по N файлов между агентами (0 — не делить)")
    args = parser.parse_args(argv)

    config = ConverterConfig()
    if args.no_ocr:
        config.ocr_enabled = False
    if args.agents is not None:
        config.swarm_agents = args.agents
    if args.split is not None:
        config.swarm_split_size = args.split

    if args.action == "status":
        return cmd_status(config, args.sections)
    if args.action == "manifest":
        return cmd_manifest(config)
    return cmd_run(config, args.sections, args.limit, args.force)


if __name__ == "__main__":
    raise SystemExit(main())
