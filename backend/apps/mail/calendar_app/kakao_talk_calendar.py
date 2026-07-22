"""톡캘린더 REST — 일정 생성·조회·겹침 검사."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.adapter.outbound.orm.orchestration_orm import UserSetting
from secretary.adapter.outbound.orm.kakao_account import KakaoAccount
from secretary.app.use_cases.kakao_oauth import refresh_kakao_access_token

logger = logging.getLogger(__name__)

KAKAO_CREATE_EVENT = "https://kapi.kakao.com/v2/api/calendar/create/event"
KAKAO_LIST_EVENTS = "https://kapi.kakao.com/v2/api/calendar/events"
SEOUL = ZoneInfo("Asia/Seoul")


def _scope_has_calendar(scope: str | None) -> bool:
    if not scope:
        return False
    parts = {p.strip() for p in scope.replace(",", " ").split() if p.strip()}
    return "talk_calendar" in parts


def _parse_local(date: str, time: str) -> datetime:
    return datetime.strptime(f"{date} {time}", "%Y-%m-%d %H:%M").replace(tzinfo=SEOUL)


def event_to_kakao_payload(
    *,
    title: str,
    date: str,
    start_time: str,
    end_time: str,
    description: str = "",
    location: str = "",
) -> dict[str, Any]:
    start = _parse_local(date, start_time)
    end = _parse_local(date, end_time)
    if end <= start:
        end = start + timedelta(hours=1)
    event: dict[str, Any] = {
        "title": title[:50] if title else "일정",
        "time": {
            "start_at": start.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "end_at": end.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "time_zone": "Asia/Seoul",
            "all_day": False,
        },
    }
    if description:
        event["description"] = description[:5000]
    if location:
        event["location"] = {"name": location[:100]}
    return event


def _intervals_overlap(a0: datetime, a1: datetime, b0: datetime, b1: datetime) -> bool:
    return a0 < b1 and b0 < a1


def _parse_iso(value: str | None) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    try:
        if value.endswith("Z"):
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        return datetime.fromisoformat(value)
    except ValueError:
        return None


async def is_kakao_calendar_sync_enabled(session: AsyncSession, user_id: int) -> bool:
    result = await session.execute(select(UserSetting).where(UserSetting.user_id == user_id))
    row = result.scalar_one_or_none()
    return bool(row and row.kakao_calendar_sync)


async def get_valid_access_token(session: AsyncSession, user_id: int) -> str | None:
    result = await session.execute(select(KakaoAccount).where(KakaoAccount.user_id == user_id))
    row = result.scalar_one_or_none()
    if not row:
        return None

    now = datetime.now(timezone.utc)
    expires = row.expires_at
    if expires is not None and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    if expires and expires > now + timedelta(minutes=2):
        return row.access_token

    if not row.refresh_token:
        return row.access_token

    try:
        refreshed = await refresh_kakao_access_token(row.refresh_token)
    except ValueError as exc:
        logger.warning("[kakao_calendar] refresh 실패 user_id=%s: %s", user_id, exc)
        return None

    row.access_token = refreshed["access_token"]
    row.refresh_token = refreshed.get("refresh_token") or row.refresh_token
    row.expires_at = refreshed.get("expires_at")
    if refreshed.get("scope"):
        row.scope = refreshed["scope"]
        row.calendar_scope = _scope_has_calendar(row.scope) or row.calendar_scope
    await session.flush()
    return row.access_token


async def list_events_in_range(
    access_token: str,
    *,
    from_at: datetime,
    to_at: datetime,
) -> list[dict[str, Any]]:
    params = {
        "from": from_at.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "to": to_at.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "limit": 50,
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        res = await client.get(
            KAKAO_LIST_EVENTS,
            headers={"Authorization": f"Bearer {access_token}"},
            params=params,
        )
    if res.status_code == 403:
        raise PermissionError("톡캘린더 동의가 필요합니다.")
    if res.status_code >= 400:
        logger.warning("[kakao_calendar] events list failed: %s %s", res.status_code, res.text[:200])
        raise ValueError("톡캘린더 일정 조회에 실패했습니다.")
    body = res.json()
    events = body.get("events") if isinstance(body, dict) else None
    if not isinstance(events, list):
        return []
    return [e for e in events if isinstance(e, dict)]


def find_overlaps(
    existing: list[dict[str, Any]],
    *,
    start: datetime,
    end: datetime,
) -> list[dict[str, str]]:
    conflicts: list[dict[str, str]] = []
    for item in existing:
        time_obj = item.get("time") if isinstance(item.get("time"), dict) else {}
        b0 = _parse_iso(time_obj.get("start_at") if isinstance(time_obj, dict) else None)
        b1 = _parse_iso(time_obj.get("end_at") if isinstance(time_obj, dict) else None)
        if not b0 or not b1:
            continue
        if _intervals_overlap(start.astimezone(timezone.utc), end.astimezone(timezone.utc), b0, b1):
            title = item.get("title")
            conflicts.append(
                {
                    "title": title if isinstance(title, str) else "기존 일정",
                    "start_at": b0.astimezone(SEOUL).strftime("%Y-%m-%d %H:%M"),
                    "end_at": b1.astimezone(SEOUL).strftime("%Y-%m-%d %H:%M"),
                }
            )
    return conflicts


async def create_talk_calendar_event(
    access_token: str,
    event: dict[str, Any],
    *,
    calendar_id: str = "primary",
) -> str | None:
    data = {
        "calendar_id": calendar_id,
        "event": json.dumps(event, ensure_ascii=False),
    }
    async with httpx.AsyncClient(timeout=20.0) as client:
        res = await client.post(
            KAKAO_CREATE_EVENT,
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data=data,
        )
    if res.status_code == 403:
        raise PermissionError("톡캘린더 동의가 필요합니다.")
    if res.status_code >= 400:
        logger.warning("[kakao_calendar] create failed: %s %s", res.status_code, res.text[:300])
        raise ValueError("톡캘린더 일정 생성에 실패했습니다.")
    body = res.json()
    event_id = body.get("event_id") if isinstance(body, dict) else None
    return str(event_id) if event_id is not None else None


async def sync_event_to_kakao(
    session: AsyncSession,
    user_id: int,
    *,
    title: str,
    date: str,
    start_time: str,
    end_time: str,
    description: str = "",
    location: str = "",
    confirm_overlap: bool = False,
) -> dict[str, Any]:
    """
    설정 ON + 토큰 있을 때만 톡캘린더에 생성.
    겹치면 confirm_overlap=False 일 때 needs_confirm 반환.
    """
    if not await is_kakao_calendar_sync_enabled(session, user_id):
        return {"skipped": True, "reason": "sync_off"}

    token = await get_valid_access_token(session, user_id)
    if not token:
        return {
            "skipped": True,
            "reason": "needs_consent",
            "message": "카카오 톡캘린더 연동이 필요합니다. 설정에서 연동을 다시 켜 주세요.",
        }

    result = await session.execute(select(KakaoAccount).where(KakaoAccount.user_id == user_id))
    account = result.scalar_one_or_none()
    if account and not account.calendar_scope:
        return {
            "skipped": True,
            "reason": "needs_consent",
            "message": "톡캘린더 일정 권한이 없습니다. 설정에서 연동 동의를 완료해 주세요.",
        }

    start = _parse_local(date, start_time)
    end = _parse_local(date, end_time)
    if end <= start:
        end = start + timedelta(hours=1)

    try:
        existing = await list_events_in_range(
            token,
            from_at=start - timedelta(hours=1),
            to_at=end + timedelta(hours=1),
        )
    except PermissionError:
        return {
            "skipped": True,
            "reason": "needs_consent",
            "message": "톡캘린더 동의가 필요합니다.",
        }

    conflicts = find_overlaps(existing, start=start, end=end)
    if conflicts and not confirm_overlap:
        titles = ", ".join(c["title"] for c in conflicts[:3])
        return {
            "needs_confirm": True,
            "conflicts": conflicts,
            "message": (
                f"톡캘린더에 겹치는 일정이 있습니다 ({titles}). "
                "그래도 등록할까요?"
            ),
        }

    payload = event_to_kakao_payload(
        title=title,
        date=date,
        start_time=start_time,
        end_time=end_time,
        description=description,
        location=location,
    )
    try:
        event_id = await create_talk_calendar_event(token, payload)
    except PermissionError:
        return {
            "skipped": True,
            "reason": "needs_consent",
            "message": "톡캘린더 동의가 필요합니다.",
        }

    return {
        "ok": True,
        "event_id": event_id,
        "had_conflicts": bool(conflicts),
        "message": "톡캘린더에 일정이 등록되었습니다."
        + (" (겹치는 일정이 있어 확인 후 등록했습니다.)" if conflicts else ""),
    }
