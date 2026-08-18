"""능동 알림 설정 API."""

from __future__ import annotations

import logging

from fastapi import Depends
from fastapi.responses import JSONResponse
from fastapi.routing import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from orchestration.adapter.inbound.api.schemas.notification_settings_schema import (
    NotificationSettingsOut,
    PatchNotificationSettingsBody,
)
from orchestration.adapter.outbound.pg.notification_settings_pg_repository import (
    NotificationSettingsPgRepository,
)
from orchestration.adapter.outbound.pg.orchestration_pg_repository import OrchestrationPgRepository
from orchestration.app.composition.providers import get_orchestration_pg_repository

logger = logging.getLogger(__name__)

notification_settings_router = APIRouter(prefix="/orchestration", tags=["orchestration"])


def _clamp_int(value: object, default: int, lo: int, hi: int) -> int:
    try:
        parsed = int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default
    return max(lo, min(hi, parsed))


def _to_out(user_id: int, row) -> NotificationSettingsOut:
    mode = (row.briefing_validator_mode or "auto").strip().lower()
    if mode not in ("auto", "review"):
        mode = "auto"
    density = _clamp_int(getattr(row, "density_threshold", 3), 3, 2, 4)
    if density not in (2, 3, 4):
        density = 3
    return NotificationSettingsOut(
        user_id=user_id,
        alert_calendar_density=bool(row.alert_calendar_density),
        alert_urgent_messages=bool(row.alert_urgent_messages),
        briefing_validator_mode=mode,
        briefing_hour=_clamp_int(getattr(row, "briefing_hour", 7), 7, 0, 23),
        briefing_minute=_clamp_int(getattr(row, "briefing_minute", 0), 0, 0, 59),
        density_threshold=density,
        active_hours_start=_clamp_int(getattr(row, "active_hours_start", 8), 8, 0, 23),
        active_hours_end=_clamp_int(getattr(row, "active_hours_end", 20), 20, 1, 24),
    )


@notification_settings_router.get(
    "/notification-settings",
    response_model=NotificationSettingsOut,
)
async def get_notification_settings(
    user_id: int,
    session: AsyncSession = Depends(get_db),
    repo: OrchestrationPgRepository = Depends(get_orchestration_pg_repository),
) -> NotificationSettingsOut:
    await repo.verify_user(user_id)
    settings_repo = NotificationSettingsPgRepository(session)
    row = await settings_repo.get(user_id)
    return _to_out(user_id, row)


@notification_settings_router.patch(
    "/notification-settings",
    response_model=NotificationSettingsOut,
)
async def patch_notification_settings(
    body: PatchNotificationSettingsBody,
    session: AsyncSession = Depends(get_db),
    repo: OrchestrationPgRepository = Depends(get_orchestration_pg_repository),
) -> NotificationSettingsOut | JSONResponse:
    await repo.verify_user(body.user_id)
    if (
        body.alert_calendar_density is None
        and body.alert_urgent_messages is None
        and body.briefing_validator_mode is None
        and body.briefing_hour is None
        and body.briefing_minute is None
        and body.density_threshold is None
        and body.active_hours_start is None
        and body.active_hours_end is None
    ):
        return JSONResponse({"detail": "변경할 설정이 없습니다."}, status_code=400)

    settings_repo = NotificationSettingsPgRepository(session)
    row = await settings_repo.update(
        body.user_id,
        alert_calendar_density=body.alert_calendar_density,
        alert_urgent_messages=body.alert_urgent_messages,
        briefing_validator_mode=body.briefing_validator_mode,
        briefing_hour=body.briefing_hour,
        briefing_minute=body.briefing_minute,
        density_threshold=body.density_threshold,
        active_hours_start=body.active_hours_start,
        active_hours_end=body.active_hours_end,
    )
    await session.commit()
    logger.info(
        "[notification_settings] user_id=%s calendar=%s urgent=%s validator_mode=%s "
        "briefing=%02d:%02d density=%s hours=%02d-%02d",
        body.user_id,
        row.alert_calendar_density,
        row.alert_urgent_messages,
        row.briefing_validator_mode,
        row.briefing_hour,
        row.briefing_minute,
        row.density_threshold,
        row.active_hours_start,
        row.active_hours_end,
    )
    return _to_out(body.user_id, row)
