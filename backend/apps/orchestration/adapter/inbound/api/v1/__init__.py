"""orchestration HTTP API v1 — 라우터 통합."""

from __future__ import annotations

from fastapi import APIRouter

from orchestration.adapter.inbound.api.v1.briefing_router import briefing_router
from orchestration.adapter.inbound.api.v1.demo_router import demo_router
from orchestration.adapter.inbound.api.v1.integrations_router import integrations_router
from orchestration.adapter.inbound.api.v1.notification_settings_router import (
    notification_settings_router,
)
from orchestration.adapter.inbound.api.v1.weekly_report_router import weekly_report_router
from orchestration.adapter.inbound.api.v1.chat_session_router import chat_session_router
from orchestration.adapter.inbound.api.v1.message_router import message_router
from orchestration.adapter.inbound.api.v1.settings_router import settings_router

orchestration_router = APIRouter()
orchestration_router.include_router(settings_router)
orchestration_router.include_router(briefing_router)
orchestration_router.include_router(demo_router)
orchestration_router.include_router(weekly_report_router)
orchestration_router.include_router(notification_settings_router)
orchestration_router.include_router(integrations_router)

chat_router = APIRouter()
chat_router.include_router(chat_session_router)
chat_router.include_router(message_router)

__all__ = ["orchestration_router", "chat_router"]
