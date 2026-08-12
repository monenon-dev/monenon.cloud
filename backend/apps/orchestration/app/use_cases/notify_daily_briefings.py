"""cron용 — 오늘자 브리핑 알림 발송."""

from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.adapter.outbound.orm.daily_briefing_orm import DailyBriefing
from orchestration.app.briefing.briefing_notify import deliver_briefing_notification
from orchestration.app.use_cases.get_or_create_today_briefing import (
    list_active_user_ids,
    today_seoul,
)

logger = logging.getLogger(__name__)


async def notify_briefings_for_active_users(session: AsyncSession) -> dict[str, int]:
    """오늘자 브리핑 중 아직 notified_at 없는 건에 대해 알림 발송."""
    briefing_date = today_seoul()
    user_ids = await list_active_user_ids(session)
    sent = 0
    skipped = 0
    failed = 0

    for uid in user_ids:
        row = (
            await session.execute(
                select(DailyBriefing).where(
                    DailyBriefing.user_id == uid,
                    DailyBriefing.briefing_date == briefing_date,
                )
            )
        ).scalar_one_or_none()
        if row is None:
            skipped += 1
            continue
        if row.notified_at is not None:
            skipped += 1
            continue
        try:
            result = await deliver_briefing_notification(
                session,
                user_id=uid,
                briefing=row,
            )
            status = result.get("status")
            if status == "sent":
                sent += 1
            elif status == "skipped":
                skipped += 1
            else:
                failed += 1
        except Exception as exc:
            failed += 1
            logger.exception("[briefing_notify_cron] user_id=%s failed: %s", uid, exc)
            await session.rollback()

    logger.info(
        "[briefing_notify_cron] users=%s sent=%s skipped=%s failed=%s",
        len(user_ids),
        sent,
        skipped,
        failed,
    )
    return {
        "users": len(user_ids),
        "sent": sent,
        "skipped": skipped,
        "failed": failed,
    }
