#!/usr/bin/env python3
"""gateway/domain/prototypes.py → JSONL 시드 생성 (학습 데이터 확장용)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend" / "apps"))

from gateway.domain.prototypes import INTENT_PROTOTYPES  # noqa: E402


def main() -> int:
    out = Path(__file__).resolve().parent / "data" / "seed_from_prototypes.jsonl"
    lines: list[str] = []
    for intent, phrases in INTENT_PROTOTYPES.items():
        for text in phrases:
            lines.append(json.dumps({"text": text, "label": intent.value}, ensure_ascii=False))
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {len(lines)} rows → {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
