"""브리핑·능동 감시용 캘린더 소스 — 톡캘린더(Kakao) 연동.

브리핑 그래프의 calendar 노드와 watcher의 일정 밀집/겹침 감지가 공용한다.
연동이 꺼져 있거나 동의가 없으면 ``status: skipped`` 로 반환해 그래프 전체는 계속 진행한다.
API·토큰 오류만 ``status: error`` 이다.
"""

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
    """지금부터 ``hours_ahead`` 시간 내 일정을 조회한다 (watcher·브리핑 공용).

    연동 off / 동의 없음 → ``skipped``. API 실패 → ``error``. 일정 없음 → ``success`` + 빈 items.
    """
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
    """앞 ``hours_ahead`` 시간 내 일정 수가 ``threshold`` 이상이면 ``DetectedIssue`` 목록 반환.

    watcher 전용. 브리핑 그래프에서는 호출하지 않는다. 해당 없으면 빈 리스트.
    """
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
    """겹치는 일정 쌍을 찾아 ``DetectedIssue`` 목록으로 반환 (watcher 전용).

    시간 정보가 없는 이벤트는 건너뛴다. 겹침이 없으면 빈 리스트.
    """
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


def _calendar_item_key(item: dict[str, str]) -> str:
    return f"{(item.get('meta') or '').strip()}|{(item.get('title') or '').strip()}"


def _merge_calendar_display_items(
    *lists: list[dict[str, str]],
) -> list[dict[str, str]]:
    seen: set[str] = set()
    merged: list[dict[str, str]] = []
    for items in lists:
        for item in items:
            title = str(item.get("title") or "").strip()
            if not title:
                continue
            key = _calendar_item_key(item)
            if key in seen:
                continue
            seen.add(key)
            merged.append({"title": title, "meta": str(item.get("meta") or "").strip()})
    return sorted(merged, key=lambda row: row.get("meta") or "")


async def _append_home_meetings(
    session: AsyncSession,
    user_id: int,
    items: list[dict[str, str]],
) -> list[dict[str, str]]:
    from orchestration.app.briefing.demo_schedule import get_home_meeting_calendar_items

    home = await get_home_meeting_calendar_items(session, user_id)
    if not home:
        return items
    display_home = [{"title": i["title"], "meta": i.get("meta") or ""} for i in home]
    return _merge_calendar_display_items(items, display_home)


async def _demo_calendar_result(
    session: AsyncSession,
    user_id: int,
) -> dict[str, Any] | None:
    from orchestration.app.briefing.demo_schedule import get_demo_calendar_items

    demo = await get_demo_calendar_items(session, user_id)
    if not demo:
        return None
    return {
        "source": "calendar",
        "status": "success",
        "tool": "calendar.demo",
        "params": {"range": "today", "meetings": len(demo), "demo": True},
        "items": demo,
        "events": [],
    }


async def fetch_today_calendar(session: AsyncSession, user_id: int) -> dict[str, Any]:
    """브리핑 그래프용 — 오늘(Asia/Seoul) 일정을 조회한다.

    연동 off / 동의 없음 → 데모 일정이 있으면 사용, 없으면 ``skipped``.
    API 실패 → ``error`` (데모 폴백). 일정 없음 → 데모 또는 ``success`` + 빈 items.
    """
    if not await is_kakao_calendar_sync_enabled(session, user_id):
        demo = await _demo_calendar_result(session, user_id)
        if demo:
            return demo
        return {"source": "calendar", "status": "skipped", "reason": "sync_off", "items": []}

    now = datetime.now(SEOUL)
    day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)
    events, err = await _load_calendar_events(session, user_id, from_at=day_start, to_at=day_end)
    if err:
        demo = await _demo_calendar_result(session, user_id)
        if demo:
            return demo
        return {"source": "calendar", **err, "items": []}

    items = [_format_event(e) for e in events]
    items = await _append_home_meetings(session, user_id, items)
    if not items:
        demo = await _demo_calendar_result(session, user_id)
        if demo:
            return demo
    return {
        "source": "calendar",
        "status": "success",
        "tool": "calendar.list",
        "params": {"range": "today", "meetings": len(items)},
        "items": items,
        "events": events,
    }


async def today_calendar_has_items(session: AsyncSession, user_id: int) -> bool:
    result = await fetch_today_calendar(session, user_id)
    items = result.get("items") if isinstance(result, dict) else None
    return isinstance(items, list) and len(items) > 0
