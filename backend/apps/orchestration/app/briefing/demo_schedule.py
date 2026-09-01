"""브리핑용 데모 일정 — 연동 데이터가 없을 때 샘플 일정을 심는다."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.adapter.outbound.orm.user_integration_orm import UserIntegration

SEOUL = ZoneInfo("Asia/Seoul")
DEMO_PROVIDER = "demo_calendar"

_SEED_ACCEPT = re.compile(
    r"("
    r"네[,.]?\s*(만들어|생성|해\s*줘|주세요)|"
    r"응[,.]?\s*(만들|생성)|"
    r"좋아요[,.]?\s*(만들|생성)|"
    r"만들어\s*줘|생성해(\s*줘)?|심어\s*줘|"
    r"데모\s*일정|샘플\s*(일정|데이터)|일정\s*만들"
    r")",
    re.I,
)
_SEED_DECLINE = re.compile(r"^(아니요|아니|됐어|괜찮아요|괜찮|다음에)$", re.I)


def is_seed_schedule_accept(text: str) -> bool:
    t = (text or "").strip()
    if not t or len(t) > 80:
        return False
    if _SEED_DECLINE.match(t):
        return False
    return bool(_SEED_ACCEPT.search(t))


def is_seed_schedule_decline(text: str) -> bool:
    return bool(_SEED_DECLINE.match((text or "").strip()))


def build_today_demo_items(*, now: datetime | None = None) -> list[dict[str, str]]:
    """오늘(Asia/Seoul) 기준 샘플 일정 3건."""
    base = (now or datetime.now(SEOUL)).astimezone(SEOUL)
    day = base.replace(second=0, microsecond=0)
    slots = [
        (9, 30, "Standup · Core", "팀 스탠드업"),
        (11, 0, "Design sync", "디자인·제품 싱크"),
        (14, 0, "Investor prep", "투자자 미팅 자료 점검"),
    ]
    items: list[dict[str, str]] = []
    for hour, minute, title, note in slots:
        start = day.replace(hour=hour, minute=minute)
        items.append(
            {
                "title": title,
                "meta": start.strftime("%H:%M"),
                "preview": note,
                "start_at": start.isoformat(),
            }
        )
    return items


async def _get_demo_row(
    session: AsyncSession,
    user_id: int,
) -> UserIntegration | None:
    result = await session.execute(
        select(UserIntegration).where(
            UserIntegration.user_id == user_id,
            UserIntegration.provider == DEMO_PROVIDER,
        )
    )
    return result.scalar_one_or_none()


async def get_demo_calendar_items(
    session: AsyncSession,
    user_id: int,
) -> list[dict[str, str]]:
    row = await _get_demo_row(session, user_id)
    if row is None or not row.enabled:
        return []
    meta = row.metadata_json if isinstance(row.metadata_json, dict) else {}
    today = datetime.now(SEOUL).date().isoformat()
    if meta.get("date") != today:
        return []
    return _merge_stored_items(_read_home_items(meta), _read_demo_seed_items(meta))


def _parse_stored_items(raw: Any) -> list[dict[str, str]]:
    if not isinstance(raw, list):
        return []
    out: list[dict[str, str]] = []
    for x in raw:
        if isinstance(x, dict) and isinstance(x.get("title"), str):
            out.append(
                {
                    "title": str(x["title"]),
                    "meta": str(x.get("meta") or ""),
                    "preview": str(x.get("preview") or ""),
                    "start_at": str(x.get("start_at") or ""),
                }
            )
    return out


def _read_home_items(meta: dict[str, Any]) -> list[dict[str, str]]:
    home = meta.get("home_items")
    if isinstance(home, list):
        return _parse_stored_items(home)
    if meta.get("source") == "home_meetings":
        return _parse_stored_items(meta.get("items"))
    return []


def _read_demo_seed_items(meta: dict[str, Any]) -> list[dict[str, str]]:
    if meta.get("source") == "home_meetings":
        return []
    return _parse_stored_items(meta.get("items"))


def _merge_stored_items(*lists: list[dict[str, str]]) -> list[dict[str, str]]:
    seen: set[str] = set()
    merged: list[dict[str, str]] = []
    for items in lists:
        for item in items:
            title = (item.get("title") or "").strip()
            meta = (item.get("meta") or "").strip()
            if not title:
                continue
            key = f"{meta}|{title}"
            if key in seen:
                continue
            seen.add(key)
            merged.append(item)
    return sorted(merged, key=lambda row: row.get("meta") or "")


async def get_home_meeting_calendar_items(
    session: AsyncSession,
    user_id: int,
) -> list[dict[str, str]]:
    """홈에서 저장한 오늘 중요 미팅(브리핑·캘린더 병합용)."""
    row = await _get_demo_row(session, user_id)
    if row is None or not row.enabled:
        return []
    meta = row.metadata_json if isinstance(row.metadata_json, dict) else {}
    today = datetime.now(SEOUL).date().isoformat()
    if meta.get("date") != today:
        return []
    return _read_home_items(meta)


def events_from_demo_items(items: list[dict[str, str]]) -> list[dict[str, str]]:
    """홈 위젯용 {time, title} 목록."""
    out: list[dict[str, str]] = []
    for x in items:
        title = (x.get("title") or "").strip()
        time = (x.get("meta") or "").strip()
        if len(time) >= 5:
            time = time[:5]
        if title and time:
            out.append({"time": time, "title": title})
    return out


async def get_home_meeting_events(
    session: AsyncSession,
    user_id: int,
) -> list[dict[str, str]]:
    """홈에서 저장한 오늘 미팅만 반환. 데모 시드는 제외."""
    items = await get_home_meeting_calendar_items(session, user_id)
    return events_from_demo_items(items)


async def seed_demo_calendar(
    session: AsyncSession,
    user_id: int,
) -> list[dict[str, str]]:
    """오늘 데모 일정을 user_integrations(demo_calendar)에 저장."""
    items = build_today_demo_items()
    today = datetime.now(SEOUL).date().isoformat()
    row = await _get_demo_row(session, user_id)
    prev = row.metadata_json if row and isinstance(row.metadata_json, dict) else {}
    home_items = _read_home_items(prev) if prev.get("date") == today else []
    meta: dict[str, Any] = {
        "date": today,
        "items": items,
        "home_items": home_items,
        "seeded_at": datetime.now(SEOUL).isoformat(),
        "source": "demo_seed",
    }
    now = datetime.now(SEOUL)
    if row is None:
        row = UserIntegration(
            user_id=user_id,
            provider=DEMO_PROVIDER,
            access_token="demo",
            refresh_token=None,
            expires_at=None,
            enabled=True,
            metadata_json=meta,
            connected_at=now,
        )
        session.add(row)
    else:
        row.access_token = "demo"
        row.enabled = True
        row.metadata_json = meta
        row.connected_at = row.connected_at or now
    await session.commit()
    return items


async def save_user_meetings(
    session: AsyncSession,
    user_id: int,
    events: list[dict[str, str]],
) -> list[dict[str, str]]:
    """홈에서 입력한 오늘 중요 미팅을 demo_calendar에 저장."""
    day = datetime.now(SEOUL).replace(second=0, microsecond=0)
    items: list[dict[str, str]] = []
    for ev in events:
        raw_time = (ev.get("time") or "").strip()
        title = (ev.get("title") or "").strip()
        if not raw_time or not title:
            continue
        parts = raw_time.split(":")
        if len(parts) < 2:
            continue
        try:
            hour, minute = int(parts[0]), int(parts[1])
        except ValueError:
            continue
        if hour > 23 or minute > 59:
            continue
        start = day.replace(hour=hour, minute=minute)
        items.append(
            {
                "title": title[:120],
                "meta": start.strftime("%H:%M"),
                "preview": title[:120],
                "start_at": start.isoformat(),
            }
        )
    today = datetime.now(SEOUL).date().isoformat()
    row = await _get_demo_row(session, user_id)
    prev = row.metadata_json if row and isinstance(row.metadata_json, dict) else {}
    demo_items = _read_demo_seed_items(prev) if prev.get("date") == today else []
    meta: dict[str, Any] = {
        "date": today,
        "items": demo_items,
        "home_items": items,
        "seeded_at": datetime.now(SEOUL).isoformat(),
        "source": "home_meetings",
    }
    now = datetime.now(SEOUL)
    if row is None:
        row = UserIntegration(
            user_id=user_id,
            provider=DEMO_PROVIDER,
            access_token="demo",
            refresh_token=None,
            expires_at=None,
            enabled=True,
            metadata_json=meta,
            connected_at=now,
        )
        session.add(row)
    else:
        row.access_token = "demo"
        row.enabled = True
        row.metadata_json = meta
        row.connected_at = row.connected_at or now
    await session.commit()
    return items


def format_seed_offer_markdown() -> str:
    return (
        "## 브리핑에 쓸 일정이 없어요\n\n"
        "톡캘린더 연동이 없거나 오늘 일정이 비어 있습니다.\n\n"
        "원하시면 **오늘 데모 일정 3건**을 만든 뒤 바로 브리핑을 생성할 수 있어요.\n\n"
        "- Standup · Core (09:30)\n"
        "- Design sync (11:00)\n"
        "- Investor prep (14:00)\n\n"
        "**데모 일정을 만들고 브리핑할까요?**\n"
        "`네, 만들어 줘` 또는 `일정 만들어줘` 라고 답해 주세요."
    )


def format_seed_done_prefix(items: list[dict[str, str]]) -> str:
    lines = ", ".join(
        f"{i.get('meta', '')} {i.get('title', '')}".strip() for i in items[:3]
    )
    return f"오늘 데모 일정을 준비했습니다: {lines}.\n\n"
