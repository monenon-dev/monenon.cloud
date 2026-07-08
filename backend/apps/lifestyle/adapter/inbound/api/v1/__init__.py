"""lifestyle HTTP API v1 — 라우터 통합."""

from __future__ import annotations

from fastapi import APIRouter

from lifestyle.adapter.inbound.api.v1.chat_session_router import chat_session_router
from lifestyle.adapter.inbound.api.v1.closet_item_router import closet_item_router
from lifestyle.adapter.inbound.api.v1.closet_router import closet_router
from lifestyle.adapter.inbound.api.v1.message_router import message_router
from lifestyle.adapter.inbound.api.v1.music_item_router import music_item_router
from lifestyle.adapter.inbound.api.v1.music_router import music_router
from lifestyle.adapter.inbound.api.v1.refrigerator_item_router import refrigerator_item_router
from lifestyle.adapter.inbound.api.v1.refrigerator_router import refrigerator_router
from lifestyle.adapter.inbound.api.v1.settings_router import settings_router

lifestyle_router = APIRouter()
lifestyle_router.include_router(settings_router)
lifestyle_router.include_router(closet_router)
lifestyle_router.include_router(closet_item_router)
lifestyle_router.include_router(refrigerator_router)
lifestyle_router.include_router(refrigerator_item_router)
lifestyle_router.include_router(music_router)
lifestyle_router.include_router(music_item_router)

chat_router = APIRouter()
chat_router.include_router(chat_session_router)
chat_router.include_router(message_router)

__all__ = ["lifestyle_router", "chat_router"]
