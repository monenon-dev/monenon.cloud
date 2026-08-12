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
    ) -> None:
        row = ProactiveAlert(
            user_id=user_id,
            alert_type=alert_type,
            trigger_key=trigger_key,
        )
        self._session.add(row)
        await self._session.flush()
