"""인앱 proactive_alerts 조회·읽음 API."""

from __future__ import annotations

import logging

from fastapi import Depends, Query
from fastapi.responses import JSONResponse
from fastapi.routing import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from orchestration.adapter.inbound.api.schemas.proactive_alerts_schema import (
    ProactiveAlertListOut,
    ProactiveAlertOut,
    RecentAlertListOut,
    RecentAlertOut,
)
from orchestration.adapter.outbound.orm.proactive_alert_orm import ProactiveAlert
from orchestration.adapter.outbound.pg.orchestration_pg_repository import OrchestrationPgRepository
from orchestration.adapter.outbound.pg.proactive_alert_pg_repository import (
    ProactiveAlertPgRepository,
)
from orchestration.app.composition.providers import get_orchestration_pg_repository

logger = logging.getLogger(__name__)

proactive_alerts_router = APIRouter(prefix="/orchestration", tags=["orchestration"])


def _display_message(row: ProactiveAlert) -> str:
    if isinstance(row.message, str) and row.message.strip():
        return row.message.strip()
    return row.trigger_key or row.alert_type or "알림"


def _to_out(row: ProactiveAlert) -> ProactiveAlertOut:
    return ProactiveAlertOut(
        id=row.id,
        alert_type=row.alert_type,
        trigger_key=row.trigger_key,
        message=_display_message(row),
        sent_at=row.sent_at,
        read_at=row.read_at,
        is_read=row.read_at is not None,
    )


_ALERT_LABELS = {
    "morning_briefing": "아침 브리핑",
    "calendar_density": "일정 밀집",
    "calendar_conflict": "일정 밀집",
    "gmail_deadline": "긴급 메일",
    "slack_urgent": "긴급 메일",
}


def _alert_label(alert_type: str) -> str:
    key = (alert_type or "").strip()
    return _ALERT_LABELS.get(key, "알림")


def _alert_summary(row: ProactiveAlert) -> str:
    text = _display_message(row)
    first = text.splitlines()[0].strip() if text else ""
    if len(first) > 80:
        return first[:79] + "…"
    return first or "알림이 발송되었습니다."


@proactive_alerts_router.get("/alerts/recent", response_model=RecentAlertListOut)
async def list_recent_alerts(
    user_id: int = Query(..., ge=1),
    limit: int = Query(8, ge=1, le=20),
    session: AsyncSession = Depends(get_db),
    repo: OrchestrationPgRepository = Depends(get_orchestration_pg_repository),
) -> RecentAlertListOut:
    await repo.verify_user(user_id)
    alert_repo = ProactiveAlertPgRepository(session)
    items = await alert_repo.list_for_user(user_id, unread_only=False, days=30, limit=limit)
    return RecentAlertListOut(
        items=[
            RecentAlertOut(
                id=row.id,
                sent_at=row.sent_at,
                alert_type=row.alert_type,
                label=_alert_label(row.alert_type),
                summary=_alert_summary(row),
            )
            for row in items
        ]
    )


@proactive_alerts_router.get("/alerts", response_model=ProactiveAlertListOut)
async def list_proactive_alerts(
    user_id: int = Query(..., ge=1),
    unread_only: bool = Query(False),
    session: AsyncSession = Depends(get_db),
    repo: OrchestrationPgRepository = Depends(get_orchestration_pg_repository),
) -> ProactiveAlertListOut:
    await repo.verify_user(user_id)
    alert_repo = ProactiveAlertPgRepository(session)
    items = await alert_repo.list_for_user(user_id, unread_only=unread_only, days=7)
    if unread_only:
        unread_count = len(items)
    else:
        unread = await alert_repo.list_for_user(user_id, unread_only=True, days=7)
        unread_count = len(unread)
    return ProactiveAlertListOut(
        items=[_to_out(row) for row in items],
        unread_count=unread_count,
    )


@proactive_alerts_router.patch("/alerts/{alert_id}/read", response_model=ProactiveAlertOut)
async def mark_proactive_alert_read(
    alert_id: int,
    user_id: int = Query(..., ge=1),
    session: AsyncSession = Depends(get_db),
    repo: OrchestrationPgRepository = Depends(get_orchestration_pg_repository),
) -> ProactiveAlertOut | JSONResponse:
    await repo.verify_user(user_id)
    alert_repo = ProactiveAlertPgRepository(session)
    row = await alert_repo.mark_read(alert_id, user_id)
    if row is None:
        return JSONResponse({"detail": "알림을 찾을 수 없습니다."}, status_code=404)
    await session.commit()
    logger.info("[proactive_alerts] read alert_id=%s user_id=%s", alert_id, user_id)
    return _to_out(row)
