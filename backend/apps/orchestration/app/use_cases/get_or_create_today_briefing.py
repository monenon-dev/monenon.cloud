"""오늘자 브리핑 조회·없으면 LangGraph로 생성."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.adapter.outbound.orm.daily_briefing_orm import DailyBriefing
from orchestration.adapter.outbound.pg.daily_briefing_pg_repository import (
    DailyBriefingPgRepository,
)
from orchestration.app.briefing.format import (
    ensure_today_date_in_briefing,
    today_seoul,
)
from orchestration.app.briefing.validator_review import normalize_pending_review
from orchestration.app.use_cases.run_briefing import run_briefing
from secretary.adapter.outbound.orm.user_model import User, UserRole

logger = logging.getLogger(__name__)
SEOUL = ZoneInfo("Asia/Seoul")

DEFAULT_BRIEFING_QUERY = "오늘 일정과 최근 대화를 바탕으로 오늘의 업무 브리핑을 작성해 줘"


def _row_to_payload(row: DailyBriefing, *, created: bool) -> dict[str, Any]:
    logs = row.tool_logs if isinstance(row.tool_logs, list) else []
    day = row.briefing_date
    return {
        "content": ensure_today_date_in_briefing(row.content or "", day),
        "tool_logs": logs,
        "briefing_date": row.briefing_date.isoformat(),
        "created": created,
        "id": row.id,
        "pending_review": normalize_pending_review(row.pending_review),
        "user_notes": getattr(row, "user_notes", "") or "",
    }


ERROR_CONTENT_MARKERS = (
    "브리핑 생성 중 오류가 발생했습니다",
    "오늘의 브리핑을 생성하지 못했습니다",
)


def _is_failed_briefing_content(content: str | None) -> bool:
    text = (content or "").strip()
    if not text:
        return True
    return any(marker in text for marker in ERROR_CONTENT_MARKERS)


async def get_or_create_today_briefing(
    session: AsyncSession,
    *,
    user_id: int,
    query: str | None = None,
    speech_tone: str | None = None,
    user_type: str | None = None,
    industry: str | None = None,
    force_refresh: bool = False,
) -> dict[str, Any]:
    """오늘자 브리핑이 있으면 반환, 없으면 그래프 실행 후 저장.

    ``force_refresh=True`` 이거나 캐시가 생성 실패 문구면 다시 생성한다.
    """
    briefing_date = today_seoul()
    repo = DailyBriefingPgRepository(session)
    existing = await repo.get_by_user_date(user_id, briefing_date)
    preserved_notes = (
        (getattr(existing, "user_notes", None) or "") if existing is not None else ""
    )
    should_refresh = force_refresh or (
        existing is not None and _is_failed_briefing_content(existing.content)
    )
    if existing is not None and not should_refresh:
        return _row_to_payload(existing, created=False)

    if existing is not None and should_refresh:
        await repo.delete_by_user_date(user_id, briefing_date)
        await session.commit()

    result = await run_briefing(
        query=(query or DEFAULT_BRIEFING_QUERY).strip() or DEFAULT_BRIEFING_QUERY,
        session=session,
        user_id=user_id,
        speech_tone=speech_tone,
        user_type=user_type,
        industry=industry,
        user_notes=preserved_notes,
    )
    content = ensure_today_date_in_briefing(
        (result.get("answer") or "").strip() or "오늘의 브리핑을 생성하지 못했습니다.",
        briefing_date,
    )
    tool_logs = result.get("tool_logs") or []
    if not isinstance(tool_logs, list):
        tool_logs = []
    pending_review = normalize_pending_review(result.get("pending_review"))

    row = await repo.insert_idempotent(
        user_id=user_id,
        briefing_date=briefing_date,
        content=content,
        tool_logs=tool_logs,
        pending_review=pending_review,
        user_notes=preserved_notes,
    )
    await session.commit()
    refreshed = await repo.get_by_user_date(user_id, briefing_date) or row
    return _row_to_payload(refreshed, created=True)


async def list_active_user_ids(session: AsyncSession) -> list[int]:
    """정지되지 않은 일반 사용자 id 목록."""
    now = datetime.now(SEOUL)
    rows = (
        await session.execute(
            select(User.id).where(
                User.role == UserRole.USER,
                (User.suspended_until.is_(None)) | (User.suspended_until < now),
            )
        )
    ).scalars().all()
    return [int(x) for x in rows]


async def generate_briefings_for_active_users(session: AsyncSession) -> dict[str, int]:
    """cron용 — 활성 사용자 전원 idempotent 생성."""
    user_ids = await list_active_user_ids(session)
    created = 0
    skipped = 0
    failed = 0
    for uid in user_ids:
        try:
            payload = await get_or_create_today_briefing(session, user_id=uid)
            if payload.get("created"):
                created += 1
            else:
                skipped += 1
        except Exception as exc:
            failed += 1
            logger.exception("[daily_briefing_cron] user_id=%s failed: %s", uid, exc)
            await session.rollback()
    logger.info(
        "[daily_briefing_cron] users=%s created=%s skipped=%s failed=%s",
        len(user_ids),
        created,
        skipped,
        failed,
    )
    return {
        "users": len(user_ids),
        "created": created,
        "skipped": skipped,
        "failed": failed,
    }
