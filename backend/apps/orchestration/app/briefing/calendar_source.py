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


def _parse_event_bounds(event: dict[str, Any]) -> tuple[datetime | None, datetime | None, str, str]:
    time_obj = event.get("time") if isinstance(event.get("time"), dict) else {}
    start_raw = time_obj.get("start_at") if isinstance(time_obj, dict) else None
    end_raw = time_obj.get("end_at") if isinstance(time_obj, dict) else None
    start: datetime | None = None
    end: datetime | None = None
    if isinstance(start_raw, str):
        try:
            start = datetime.fromisoformat(start_raw.replace("Z", "+00:00")).astimezone(SEOUL)
        except ValueError:
            pass
    if isinstance(end_raw, str):
        try:
            end = datetime.fromisoformat(end_raw.replace("Z", "+00:00")).astimezone(SEOUL)
        except ValueError:
            pass
    event_id = event.get("id") or event.get("event_id") or start_raw or ""
    title = event.get("title") if isinstance(event.get("title"), str) else "일정"
    return start, end, str(event_id), title


async def _load_calendar_events(
    session: AsyncSession,
    user_id: int,
    *,
    from_at: datetime,
    to_at: datetime,
) -> tuple[list[dict[str, Any]], dict[str, Any] | None]:
    if not await is_kakao_calendar_sync_enabled(session, user_id):
        return [], {"status": "skipped", "reason": "sync_off"}

    token = await get_valid_access_token(session, user_id)
    if not token:
        return [], {"status": "skipped", "reason": "needs_consent"}

    try:
        events = await list_events_in_range(token, from_at=from_at, to_at=to_at)
        return events, None
    except (PermissionError, ValueError) as exc:
        logger.warning("[calendar_source] list failed user_id=%s: %s", user_id, exc)
        return [], {"status": "error", "reason": str(exc)}


async def fetch_calendar_window(
    session: AsyncSession,
    user_id: int,
    *,
    hours_ahead: float = 3.0,
) -> dict[str, Any]:
    """지금부터 hours_ahead 시간 내 일정 (감시·브리핑 공용)."""
    now = datetime.now(SEOUL)
    end = now + timedelta(hours=hours_ahead)
    events, err = await _load_calendar_events(session, user_id, from_at=now, to_at=end)
    if err:
        return {"source": "calendar", **err, "items": [], "events": []}

    items = [_format_event(e) for e in events]
    return {
        "source": "calendar",
        "status": "success",
        "tool": "calendar.list",
        "params": {"range_hours": hours_ahead, "meetings": len(items)},
        "items": items,
        "events": events,
    }


def detect_calendar_density(
    events: list[dict[str, Any]],
    *,
    threshold: int,
    hours_ahead: float = 3.0,
) -> list[Any]:
    from orchestration.app.watcher.types import DetectedIssue

    now = datetime.now(SEOUL)
    window_end = now + timedelta(hours=hours_ahead)
    upcoming: list[tuple[datetime, str, str]] = []
    for ev in events:
        start, _, eid, title = _parse_event_bounds(ev)
        if start is None or start < now or start > window_end:
            continue
        upcoming.append((start, eid, title))

    upcoming.sort(key=lambda x: x[0])
    if len(upcoming) < threshold:
        return []

    times = ", ".join(s.astimezone(SEOUL).strftime("%H시") for s, _, _ in upcoming[:5])
    first_id = upcoming[0][1] or upcoming[0][0].isoformat()
    day_key = now.date().isoformat()
    return [
        DetectedIssue(
            alert_type="calendar_density",
            trigger_key=f"density:{day_key}:{first_id}",
            summary=f"앞으로 {int(hours_ahead)}시간 내 미팅 {len(upcoming)}개",
            detail=f"{times}에 일정이 몰려 있습니다.",
        )
    ]


def detect_calendar_conflicts(events: list[dict[str, Any]]) -> list[Any]:
    from orchestration.app.watcher.types import DetectedIssue

    parsed: list[tuple[datetime, datetime, str, str]] = []
    for ev in events:
        start, end, eid, title = _parse_event_bounds(ev)
        if start is None or end is None:
            continue
        parsed.append((start, end, eid, title))

    issues: list[DetectedIssue] = []
    for i in range(len(parsed)):
        for j in range(i + 1, len(parsed)):
            a0, a1, aid, atitle = parsed[i]
            b0, b1, bid, btitle = parsed[j]
            if a0 < b1 and b0 < a1:
                keys = sorted([aid or atitle, bid or btitle])
                trigger = f"conflict:{keys[0]}:{keys[1]}"
                issues.append(
                    DetectedIssue(
                        alert_type="calendar_conflict",
                        trigger_key=trigger,
                        summary=f"일정 겹침: {atitle} ↔ {btitle}",
                        detail=(
                            f"{atitle} ({a0.strftime('%H:%M')}~{a1.strftime('%H:%M')})와 "
                            f"{btitle} ({b0.strftime('%H:%M')}~{b1.strftime('%H:%M')})가 겹칩니다."
                        ),
                    )
                )
    return issues


async def fetch_today_calendar(session: AsyncSession, user_id: int) -> dict[str, Any]:
    """톡캘린더에서 오늘 일정을 조회한다. 연동 없으면 skipped."""
    if not await is_kakao_calendar_sync_enabled(session, user_id):
        return {"source": "calendar", "status": "skipped", "reason": "sync_off", "items": []}

    now = datetime.now(SEOUL)
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)
    events, err = await _load_calendar_events(session, user_id, from_at=day_start, to_at=day_end)
    if err:
        return {"source": "calendar", **err, "items": []}

    items = [_format_event(e) for e in events]
    return {
        "source": "calendar",
        "status": "success",
        "tool": "calendar.list",
        "params": {"range": "today", "meetings": len(items)},
        "items": items,
        "events": events,
    }
