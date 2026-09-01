"""상황 감지형 능동 알림 — APScheduler interval 잡."""

from __future__ import annotations

import logging
import os
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

_watcher_scheduler: AsyncIOScheduler | None = None


def _env_bool(name: str, default: str = "1") -> bool:
    return os.getenv(name, default).strip().lower() not in ("0", "false", "off", "no")


def _interval_minutes() -> int:
    raw = os.getenv("WATCHER_INTERVAL_MINUTES", "30").strip()
    try:
        return max(5, int(raw))
    except ValueError:
        return 30


def _active_hours() -> tuple[int, int]:
    start_raw = os.getenv("WATCHER_ACTIVE_HOURS_START", "8").strip()
    end_raw = os.getenv("WATCHER_ACTIVE_HOURS_END", "20").strip()
    try:
        start = max(0, min(23, int(start_raw)))
    except ValueError:
        start = 8
    try:
        end = max(1, min(24, int(end_raw)))
    except ValueError:
        end = 20
    return start, end


def within_active_hours(now_hour: int, start: int, end: int) -> bool:
    """시작 시각 이상, 종료 시각 미만. start==end 이면 24시간, start>end 이면 자정 넘김."""
    try:
        start_h = max(0, min(23, int(start)))
    except (TypeError, ValueError):
        start_h = 8
    try:
        end_h = max(0, min(24, int(end)))
    except (TypeError, ValueError):
        end_h = 20
    if start_h == end_h:
        return True
    if start_h < end_h:
        return start_h <= now_hour < end_h
    return now_hour >= start_h or now_hour < end_h


async def run_watcher_job() -> None:
    from core.matrix import grid_oracle_database_manager as db
    from orchestration.app.watcher.runner import run_watcher_cycle

    if db.async_session_factory is None:
        logger.warning("[watcher] session factory 없음 — 스킵")
        return
    async with db.async_session_factory() as session:
        stats = await run_watcher_cycle(session)
        logger.info("[watcher] cycle done %s", stats)


def start_watcher_scheduler() -> AsyncIOScheduler | None:
    global _watcher_scheduler
    if not _env_bool("WATCHER_ENABLED", "1"):
        logger.info("[watcher] disabled via WATCHER_ENABLED")
        return None
    if _watcher_scheduler is not None and _watcher_scheduler.running:
        return _watcher_scheduler

    minutes = _interval_minutes()
    scheduler = AsyncIOScheduler(timezone="Asia/Seoul")
    scheduler.add_job(
        run_watcher_job,
        IntervalTrigger(minutes=minutes, timezone="Asia/Seoul"),
        id="proactive_watcher",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()
    _watcher_scheduler = scheduler
    start_h, end_h = _active_hours()
    logger.info(
        "[watcher] started every %sm KST (per-user active hours, env fallback %02d:00–%02d:00)",
        minutes,
        start_h,
        end_h,
    )
    return scheduler


def stop_watcher_scheduler() -> None:
    global _watcher_scheduler
    if _watcher_scheduler is None:
        return
    try:
        _watcher_scheduler.shutdown(wait=False)
    except Exception as exc:
        logger.warning("[watcher] shutdown: %s", exc)
    _watcher_scheduler = None


def watcher_scheduler_status() -> dict[str, Any]:
    if _watcher_scheduler is None or not _watcher_scheduler.running:
        return {"running": False, "jobs": []}
    jobs = []
    for job in _watcher_scheduler.get_jobs():
        jobs.append(
            {
                "id": job.id,
                "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            }
        )
    return {"running": True, "jobs": jobs}
