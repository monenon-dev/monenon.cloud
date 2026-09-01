"""사용자별 능동 감시 사이클."""

from __future__ import annotations

import logging
import os
from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.adapter.outbound.pg.integration_pg_repository import IntegrationPgRepository
from orchestration.adapter.outbound.pg.notification_settings_pg_repository import (
    NotificationSettingsPgRepository,
)
from orchestration.app.use_cases.get_or_create_today_briefing import list_active_user_ids
from orchestration.app.watcher.checks import run_detection_checks
from orchestration.app.watcher.notify import deliver_proactive_notification, filter_unsent_issues
from orchestration.app.watcher.scheduler import within_active_hours

logger = logging.getLogger(__name__)
SEOUL = ZoneInfo("Asia/Seoul")


def _interval_seconds() -> float:
    raw = os.getenv("WATCHER_INTERVAL_MINUTES", "30").strip()
    try:
        minutes = max(5, int(raw))
    except ValueError:
        minutes = 30
    return float(minutes * 60)


async def run_watcher_for_user(session: AsyncSession, user_id: int) -> dict:
    settings = await NotificationSettingsPgRepository(session).get(user_id)
    if not settings.alert_calendar_density and not settings.alert_urgent_messages:
        return {"status": "skipped", "reason": "settings_off"}
    if not within_active_hours(
        datetime.now(SEOUL).hour,
        getattr(settings, "active_hours_start", 8),
        getattr(settings, "active_hours_end", 20),
    ):
        return {"status": "skipped", "reason": "outside_active_hours"}

    integ_repo = IntegrationPgRepository(session)
    slack_ok = await integ_repo.is_active(user_id, "slack")
    gmail_ok = await integ_repo.is_active(user_id, "gmail")
    if not slack_ok and not gmail_ok:
        return {"status": "skipped", "reason": "no_channel"}

    since = _interval_seconds()
    issues = await run_detection_checks(session, user_id, since_seconds=since)
    if not issues:
        return {"status": "skipped", "reason": "no_issues"}

    seen: set[str] = set()
    deduped: list = []
    for issue in issues:
        if issue.trigger_key in seen:
            continue
        seen.add(issue.trigger_key)
        deduped.append(issue)
    issues = deduped

    fresh = await filter_unsent_issues(session, user_id, issues)
    if not fresh:
        return {"status": "skipped", "reason": "suppressed"}

    return await deliver_proactive_notification(session, user_id=user_id, issues=fresh)


async def run_watcher_cycle(session: AsyncSession) -> dict[str, int]:
    user_ids = await list_active_user_ids(session)
    sent = 0
    skipped = 0
    failed = 0
    for uid in user_ids:
        try:
            result = await run_watcher_for_user(session, uid)
            status = result.get("status")
            if status == "sent":
                sent += 1
            elif status == "failed":
                failed += 1
            else:
                skipped += 1
        except Exception as exc:
            failed += 1
            logger.exception("[watcher] user_id=%s failed: %s", uid, exc)
            await session.rollback()

    logger.info(
        "[watcher] cycle users=%s sent=%s skipped=%s failed=%s",
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
