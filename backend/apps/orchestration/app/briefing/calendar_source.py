"""브리핑용 캘린더 데이터 — 톡캘린더 연동 우선."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from mail.calendar_app.kakao_talk_calendar import (
    get_valid_access_token,
    is_kakao_calendar_sync_enabled,
    list_events_in_range,
)

logger = logging.getLogger(__name__)
SEOUL = ZoneInfo("Asia/Seoul")


def _format_event(item: dict[str, Any]) -> dict[str, str]:
    title = item.get("title")
    time_obj = item.get("time") if isinstance(item.get("time"), dict) else {}
    start_raw = time_obj.get("start_at") if isinstance(time_obj, dict) else None
    meta = ""
    if isinstance(start_raw, str):
        try:
            start = datetime.fromisoformat(start_raw.replace("Z", "+00:00"))
            meta = start.astimezone(SEOUL).strftime("%H:%M")
        except ValueError:
            meta = start_raw
    return {
        "title": title if isinstance(title, str) else "일정",
        "meta": meta,
    }


async def fetch_today_calendar(session: AsyncSession, user_id: int) -> dict[str, Any]:
    """톡캘린더에서 오늘 일정을 조회한다. 연동 없으면 skipped."""
    if not await is_kakao_calendar_sync_enabled(session, user_id):
        return {"source": "calendar", "status": "skipped", "reason": "sync_off", "items": []}

    token = await get_valid_access_token(session, user_id)
    if not token:
        return {
            "source": "calendar",
            "status": "skipped",
            "reason": "needs_consent",
            "items": [],
        }

    now = datetime.now(SEOUL)
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)
    try:
        events = await list_events_in_range(token, from_at=day_start, to_at=day_end)
    except (PermissionError, ValueError) as exc:
        logger.warning("[briefing_calendar] list failed user_id=%s: %s", user_id, exc)
        return {
            "source": "calendar",
            "status": "error",
            "reason": str(exc),
            "items": [],
        }

    items = [_format_event(e) for e in events]
    return {
        "source": "calendar",
        "status": "success",
        "tool": "calendar.list",
        "params": {"range": "today", "meetings": len(items)},
        "items": items,
    }
