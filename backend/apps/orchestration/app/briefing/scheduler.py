"""능동적 브리핑 — 사용자별 시각에 맞춰 발송하는 APScheduler 잡."""

from __future__ import annotations

import logging
import os
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)
SEOUL = ZoneInfo("Asia/Seoul")

_scheduler: AsyncIOScheduler | None = None


def _cron_hour_minute() -> tuple[int, int]:
    """설정 행이 없는 사용자에게 쓰는 기본 브리핑 시각."""
    raw_h = os.getenv("BRIEFING_CRON_HOUR", "7").strip()
    raw_m = os.getenv("BRIEFING_CRON_MINUTE", "0").strip()
    try:
        hour = max(0, min(23, int(raw_h)))
    except ValueError:
        hour = 7
    try:
        minute = max(0, min(59, int(raw_m)))
    except ValueError:
        minute = 0
    return hour, minute


async def run_morning_briefing_job() -> None:
    from core.matrix import grid_oracle_database_manager as db
    from orchestration.adapter.outbound.pg.notification_settings_pg_repository import (
        NotificationSettingsPgRepository,
    )
    from orchestration.app.use_cases.get_or_create_today_briefing import (
        generate_briefings_for_active_users,
        list_active_user_ids,
    )
    from orchestration.app.use_cases.notify_daily_briefings import (
        notify_briefings_for_active_users,
    )

    if db.async_session_factory is None:
        logger.warning("[briefing_cron] session factory 없음 — 스킵")
        return

    now = datetime.now(SEOUL)
    hour, minute = now.hour, now.minute
    default_hour, default_minute = _cron_hour_minute()

    async with db.async_session_factory() as session:
        active_ids = await list_active_user_ids(session)
        due_ids = await NotificationSettingsPgRepository(session).list_user_ids_due_for_briefing(
            hour,
            minute,
            active_ids=active_ids,
            default_hour=default_hour,
            default_minute=default_minute,
        )
        if not due_ids:
            logger.debug("[briefing_cron] no users due at %02d:%02d", hour, minute)
            return
        logger.info("[briefing_cron] due users=%s at %02d:%02d", len(due_ids), hour, minute)
        stats = await generate_briefings_for_active_users(session, user_ids=due_ids)
        logger.info("[briefing_cron] generation done %s", stats)
        notify_stats = await notify_briefings_for_active_users(session, user_ids=due_ids)
        logger.info("[briefing_cron] notify done %s", notify_stats)


def start_briefing_scheduler() -> AsyncIOScheduler | None:
    """앱 lifespan에서 호출. BRIEFING_CRON_ENABLED=0 이면 비활성."""
    global _scheduler
    if os.getenv("BRIEFING_CRON_ENABLED", "1").strip().lower() in ("0", "false", "off", "no"):
        logger.info("[briefing_cron] disabled via BRIEFING_CRON_ENABLED")
        return None
    if _scheduler is not None and _scheduler.running:
        return _scheduler

    scheduler = AsyncIOScheduler(timezone="Asia/Seoul")
    scheduler.add_job(
        run_morning_briefing_job,
        CronTrigger(minute="*", timezone="Asia/Seoul"),
        id="daily_briefing_morning",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()
    _scheduler = scheduler
    default_h, default_m = _cron_hour_minute()
    logger.info(
        "[briefing_cron] started Asia/Seoul every minute (default %02d:%02d)",
        default_h,
        default_m,
    )
    return scheduler


def stop_briefing_scheduler() -> None:
    global _scheduler
    if _scheduler is None:
        return
    try:
        _scheduler.shutdown(wait=False)
    except Exception as exc:
        logger.warning("[briefing_cron] shutdown: %s", exc)
    _scheduler = None


def briefing_scheduler_status() -> dict[str, Any]:
    if _scheduler is None or not _scheduler.running:
        return {"running": False, "jobs": []}
    jobs = []
    for job in _scheduler.get_jobs():
        jobs.append(
            {
                "id": job.id,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            }
        )
    return {"running": True, "jobs": jobs}
