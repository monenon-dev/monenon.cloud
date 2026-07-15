"""Moneyball 스타 온톨로지 채팅 API — Hub(7B) / Spoke(2B)."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from moneyball.adapter.inbound.api.schemas.chat_schema import (
    MoneyballChatRequest,
    MoneyballChatResponse,
)
from moneyball.app.use_cases.star_chat_interactor import run_star_chat

logger = logging.getLogger(__name__)

chat_router = APIRouter(prefix="/moneyball", tags=["moneyball"])


@chat_router.post("/chat", response_model=MoneyballChatResponse)
async def moneyball_chat(
    body: MoneyballChatRequest,
    session: AsyncSession = Depends(get_db),
) -> MoneyballChatResponse:
    """
    프론트 질문 → star_craft 허브 라우팅 → RAG 검색 → 스포크 SQL → DB → 허브(7.8B) RAG 합성.
    매 요청 journey 로그가 기록됩니다.
    """
    result = await run_star_chat(session, body.message)
    logger.info(
        "[moneyball] chat mode=%s route=%s journey_stages=%s",
        result.get("mode"),
        result.get("route"),
        len(result.get("journey") or []),
    )
    return MoneyballChatResponse.model_validate(result)
