"""일일 브리핑 DB 어댑터."""

from __future__ import annotations

import logging
from datetime import date
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.adapter.outbound.orm.daily_briefing_orm import DailyBriefing

logger = logging.getLogger(__name__)


class DailyBriefingPgRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_user_date(self, user_id: int, briefing_date: date) -> DailyBriefing | None:
        result = await self._session.execute(
            select(DailyBriefing).where(
                DailyBriefing.user_id == user_id,
                DailyBriefing.briefing_date == briefing_date,
            )
        )
        return result.scalar_one_or_none()

    async def insert_idempotent(
        self,
        *,
        user_id: int,
        briefing_date: date,
        content: str,
        tool_logs: list[dict[str, Any]],
    ) -> DailyBriefing:
        """이미 있으면 기존 행을 반환하고, 없으면 INSERT."""
        existing = await self.get_by_user_date(user_id, briefing_date)
        if existing is not None:
            return existing

        stmt = (
            insert(DailyBriefing)
            .values(
                user_id=user_id,
                briefing_date=briefing_date,
                content=content,
                tool_logs=tool_logs,
            )
            .on_conflict_do_nothing(constraint="uq_daily_briefings_user_date")
            .returning(DailyBriefing.id)
        )
        result = await self._session.execute(stmt)
        row_id = result.scalar_one_or_none()
        await self._session.flush()

        if row_id is None:
            existing = await self.get_by_user_date(user_id, briefing_date)
            if existing is None:
                raise RuntimeError("daily_briefing upsert 후 행을 찾지 못했습니다.")
            return existing

        created = await self._session.get(DailyBriefing, row_id)
        if created is None:
            raise RuntimeError("daily_briefing INSERT 후 행을 찾지 못했습니다.")
        logger.info(
            "[DailyBriefingPgRepository] created user_id=%s date=%s",
            user_id,
            briefing_date,
        )
        return created
