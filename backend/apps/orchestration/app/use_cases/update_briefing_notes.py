"""오늘 브리핑에 사용자 추가 메모를 저장한다."""

from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.adapter.outbound.pg.daily_briefing_pg_repository import (
    DailyBriefingPgRepository,
)
from orchestration.app.use_cases.get_or_create_today_briefing import (
    _row_to_payload,
    today_seoul,
)

NOTES_MAX = 4000


async def update_today_briefing_notes(
    session: AsyncSession,
    *,
    user_id: int,
    notes: str,
) -> dict[str, Any]:
    repo = DailyBriefingPgRepository(session)
    row = await repo.get_by_user_date(user_id, today_seoul())
    if row is None:
        raise ValueError("오늘의 브리핑이 아직 없습니다.")
    cleaned = (notes or "").strip()[:NOTES_MAX]
    updated = await repo.update_user_notes(row.id, user_id=user_id, notes=cleaned)
    if updated is None:
        raise RuntimeError("브리핑 메모를 저장하지 못했습니다.")
    await session.commit()
    return _row_to_payload(updated, created=False)
