"""
CLI оркестратора.

  python -m orchestrator "STATUS"
  python -m orchestrator "START PARSING"
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_AGENTS_ROOT = Path(__file__).resolve().parents[1]
if str(_AGENTS_ROOT) not in sys.path:
    sys.path.insert(0, str(_AGENTS_ROOT))

from orchestrator.agent import OrchestratorAgent


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Orchestrator Agent chat CLI")
    parser.add_argument("message", nargs="+", help="Команда формального языка")
    args = parser.parse_args(argv)
    message = " ".join(args.message)
    result = OrchestratorAgent().chat(message)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
