"""proactive_alerts DB 어댑터."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.adapter.outbound.orm.proactive_alert_orm import ProactiveAlert

logger = logging.getLogger(__name__)


class ProactiveAlertPgRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def was_sent_within(
        self,
        user_id: int,
        trigger_key: str,
        *,
        hours: int = 24,
    ) -> bool:
        since = datetime.now(timezone.utc) - timedelta(hours=hours)
        result = await self._session.execute(
            select(ProactiveAlert.id).where(
                ProactiveAlert.user_id == user_id,
                ProactiveAlert.trigger_key == trigger_key,
                ProactiveAlert.sent_at >= since,
            )
        )
        return result.scalar_one_or_none() is not None

    async def record_sent(
        self,
        *,
        user_id: int,
        alert_type: str,
        trigger_key: str,
        message: str | None = None,
    ) -> ProactiveAlert:
        row = ProactiveAlert(
            user_id=user_id,
            alert_type=alert_type,
            trigger_key=trigger_key,
            message=(message or "").strip() or None,
        )
        self._session.add(row)
        await self._session.flush()
        return row

    async def list_for_user(
        self,
        user_id: int,
        *,
        unread_only: bool = False,
        days: int = 7,
        limit: int = 50,
    ) -> list[ProactiveAlert]:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        stmt = (
            select(ProactiveAlert)
            .where(
                ProactiveAlert.user_id == user_id,
                ProactiveAlert.sent_at >= since,
            )
            .order_by(ProactiveAlert.sent_at.desc())
            .limit(limit)
        )
        if unread_only:
            stmt = stmt.where(ProactiveAlert.read_at.is_(None))
        result = await self._session.execute(stmt)
        return list(result.scalars().all())

    async def mark_read(self, alert_id: int, user_id: int) -> ProactiveAlert | None:
        result = await self._session.execute(
            select(ProactiveAlert).where(
                ProactiveAlert.id == alert_id,
                ProactiveAlert.user_id == user_id,
            )
        )
        row = result.scalar_one_or_none()
        if row is None:
            return None
        if row.read_at is None:
            row.read_at = datetime.now(timezone.utc)
            await self._session.flush()
        return row
