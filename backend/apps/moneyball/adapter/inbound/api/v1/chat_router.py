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
    프론트 질문 → 허브 라우팅 → 스포크 SQL → DB 실행 → 허브 최종 답.

    EXAONE(Ollama) 미기동 시 heuristic 모드로 동일 파이프라인이 동작합니다.
    """
    result = await run_star_chat(session, body.message)
    logger.info(
        "[moneyball] chat mode=%s route=%s",
        result.get("mode"),
        result.get("route"),
    )
    return MoneyballChatResponse.model_validate(result)
