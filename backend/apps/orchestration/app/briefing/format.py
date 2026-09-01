"""브리핑 본문 표시용 정리."""

from __future__ import annotations

import re
from datetime import date, datetime
from zoneinfo import ZoneInfo

SEOUL = ZoneInfo("Asia/Seoul")
_WEEKDAYS = "월화수목금토일"

_TITLE_HEADING = re.compile(
    r"^#{1,6}\s*오늘의\s*(업무\s*)?브리핑\s*$",
    re.IGNORECASE,
)
_DATE_LINE = re.compile(
    r"^(\*\*)?\d{4}년\s*\d{1,2}월\s*\d{1,2}일"
    r"(?:\s*[월화수목금토일]요일)?(\*\*)?\s*$"
)
_EXAMPLE_DATA_DISCLAIMER = re.compile(
    r"^\s*[*\-•]?\s*현재\s*예시\s*데이터(?:로\s*표시(?:되고\s*있습니다|됩니다)|를\s*사용)",
    re.IGNORECASE,
)


def today_seoul() -> date:
    return datetime.now(SEOUL).date()


def format_today_ko(day: date | None = None) -> str:
    d = day or today_seoul()
    return f"{d.year}년 {d.month}월 {d.day}일 {_WEEKDAYS[d.weekday()]}요일"


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


def strip_example_data_disclaimer(text: str) -> str:
    """브리핑 하단 「현재 예시 데이터로…」 안내 줄을 제거한다."""
    lines = (text or "").replace("\r\n", "\n").split("\n")
    filtered = [ln for ln in lines if not _EXAMPLE_DATA_DISCLAIMER.match(ln.strip())]
    body = "\n".join(filtered).strip()
    while body.endswith("\n\n"):
        body = body.rstrip()
    return body


def ensure_today_date_in_briefing(text: str, day: date | None = None) -> str:
    """본문 날짜를 오늘(Asia/Seoul)로 맞춘다. 날짜 줄이 없으면 맨 앞에 넣는다."""
    label = format_today_ko(day)
    body = strip_briefing_title_heading(text)
    lines = body.split("\n") if body else []
    while lines and not lines[0].strip():
        lines.pop(0)
    if lines and _DATE_LINE.match(lines[0].strip()):
        was_bold = lines[0].strip().startswith("**")
        lines[0] = f"**{label}**" if was_bold else label
        return "\n".join(lines).strip()
    prefix = f"**{label}**"
    if not body:
        return prefix
    return f"{prefix}\n\n{body}"
