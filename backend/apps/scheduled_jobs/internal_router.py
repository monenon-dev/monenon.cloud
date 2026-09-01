"""Cloud Scheduler 내부 HTTP 트리거 라우터."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from scheduled_jobs.briefing_job import run_morning_briefing
from scheduled_jobs.internal_auth import verify_internal_cron_secret
from scheduled_jobs.watcher_job import run_situation_watcher_check

internal_router = APIRouter(
    prefix="/internal",
    tags=["internal"],
    include_in_schema=False,
)


@internal_router.post("/trigger-briefing")
async def trigger_briefing(
    _: None = Depends(verify_internal_cron_secret),
) -> dict:
    return await run_morning_briefing()


@internal_router.post("/trigger-watcher")
async def trigger_watcher(
    _: None = Depends(verify_internal_cron_secret),
) -> dict:
    return await run_situation_watcher_check()
