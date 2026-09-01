#!/usr/bin/env python3
"""Block edits to secret-like files (.env, keys). Cursor preToolUse hook."""
from __future__ import annotations

import json
import re
import sys

PROTECTED = [
    re.compile(r"(^|/)\.env$"),
    re.compile(r"(^|/)\.env\."),
    re.compile(r"\.key$", re.I),
    re.compile(r"(^|/)secrets\.", re.I),
]


def extract_path(payload: dict) -> str:
    tool_input = payload.get("tool_input") or payload.get("input") or {}
    if isinstance(tool_input, dict):
        for key in ("path", "file_path", "filePath", "target_notebook"):
            value = tool_input.get(key)
            if isinstance(value, str) and value:
                return value
    for key in ("path", "file_path", "filePath"):
        value = payload.get(key)
        if isinstance(value, str) and value:
            return value
    return ""


def main() -> int:
    raw = sys.stdin.read()
    try:
        payload = json.loads(raw) if raw.strip() else {}
    except json.JSONDecodeError:
        print(json.dumps({"permission": "allow"}))
        return 0

    path = extract_path(payload)
    if path and any(p.search(path) for p in PROTECTED):
        msg = f"보안 정책: {path} 파일은 수정할 수 없습니다."
        print(
            json.dumps(
                {
                    "permission": "deny",
                    "user_message": msg,
                    "agent_message": msg,
                },
                ensure_ascii=False,
            )
        )
        return 0

    print(json.dumps({"permission": "allow"}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
