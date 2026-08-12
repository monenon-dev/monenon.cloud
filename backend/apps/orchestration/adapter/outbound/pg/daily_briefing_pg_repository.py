"""일일 브리핑 DB 어댑터."""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
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

    async def list_recent_for_user(
        self,
        user_id: int,
        *,
        days: int = 7,
    ) -> list[DailyBriefing]:
        """최근 N일(오늘 포함) daily_briefings를 날짜 오름차순으로 반환."""
        from orchestration.app.use_cases.get_or_create_today_briefing import today_seoul

        end = today_seoul()
        start = end - timedelta(days=max(days, 1) - 1)
        result = await self._session.execute(
            select(DailyBriefing)
            .where(
                DailyBriefing.user_id == user_id,
                DailyBriefing.briefing_date >= start,
                DailyBriefing.briefing_date <= end,
            )
            .order_by(DailyBriefing.briefing_date.asc())
        )
        return list(result.scalars().all())

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

    async def mark_notified(
        self,
        briefing_id: int,
        *,
        channel: str,
    ) -> DailyBriefing | None:
        row = await self._session.get(DailyBriefing, briefing_id)
        if row is None:
            return None
        row.notified_at = datetime.now(timezone.utc)
        row.notification_channel = channel[:32]
        await self._session.flush()
        await self._session.refresh(row)
        logger.info(
            "[DailyBriefingPgRepository] notified id=%s channel=%s",
            briefing_id,
            channel,
        )
        return row
