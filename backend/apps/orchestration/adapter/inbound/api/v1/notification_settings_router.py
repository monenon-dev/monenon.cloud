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


def _to_out(user_id: int, row) -> NotificationSettingsOut:
    return NotificationSettingsOut(
        user_id=user_id,
        alert_calendar_density=bool(row.alert_calendar_density),
        alert_urgent_messages=bool(row.alert_urgent_messages),
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
    if body.alert_calendar_density is None and body.alert_urgent_messages is None:
        return JSONResponse({"detail": "변경할 설정이 없습니다."}, status_code=400)

    settings_repo = NotificationSettingsPgRepository(session)
    row = await settings_repo.update(
        body.user_id,
        alert_calendar_density=body.alert_calendar_density,
        alert_urgent_messages=body.alert_urgent_messages,
    )
    await session.commit()
    logger.info(
        "[notification_settings] user_id=%s calendar=%s urgent=%s",
        body.user_id,
        row.alert_calendar_density,
        row.alert_urgent_messages,
    )
    return _to_out(body.user_id, row)
