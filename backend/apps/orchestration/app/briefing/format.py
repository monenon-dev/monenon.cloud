"""브리핑 본문 표시용 정리."""

from __future__ import annotations

import re

_TITLE_HEADING = re.compile(
    r"^#{1,6}\s*오늘의\s*(업무\s*)?브리핑\s*$",
    re.IGNORECASE,
)


def strip_briefing_title_heading(text: str) -> str:
    """본문 맨 앞의 「오늘의 브리핑」 제목 줄을 제거한다."""
    lines = (text or "").replace("\r\n", "\n").split("\n")
    while lines and not lines[0].strip():
        lines.pop(0)
    if lines and _TITLE_HEADING.match(lines[0].strip()):
        lines.pop(0)
        while lines and not lines[0].strip():
            lines.pop(0)
    return "\n".join(lines).strip()
