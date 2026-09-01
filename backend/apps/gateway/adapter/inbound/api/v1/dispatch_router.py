"""Gateway 통합 채팅 — intent 분류 후 RAG | CRUD | Gemini 디스패치."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from gateway.app.use_cases.dispatch_chat_interactor import dispatch_gateway_chat

logger = logging.getLogger(__name__)

dispatch_router = APIRouter(prefix="/gateway", tags=["gateway"])


class GatewayChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4000)


class GatewayChatResponse(BaseModel):
    ok: bool
    intent: str
    handler: str
    confidence: float
    channel: str
    reply: str
    model: str = ""
    detail: str | None = None
    extras: dict[str, Any] = Field(default_factory=dict)


@dispatch_router.post("/chat", response_model=GatewayChatResponse)
async def gateway_chat(
    body: GatewayChatRequest,
    session: AsyncSession = Depends(get_db),
) -> GatewayChatResponse | JSONResponse:
    """
    시맨틱 인텐트 → 3경로:
      - gemini → Terran Vessel (GEMINI_API_KEY)
      - exaone_rag → Moneyball RAG
      - crud → 저장소 API 안내 (LLM 비호출)
    """
    result = await dispatch_gateway_chat(session, body.query)
    logger.info(
        "[gateway/chat] intent=%s channel=%s ok=%s",
        result.intent,
        result.channel,
        result.ok,
    )
    payload = GatewayChatResponse(
        ok=result.ok,
        intent=result.intent,
        handler=result.handler,
        confidence=result.confidence,
        channel=result.channel,
        reply=result.reply,
        model=result.model,
        detail=result.detail,
        extras=result.extras,
    )
    if not result.ok:
        status = 429 if result.detail and "한도" in (result.detail or "") else 502
        return JSONResponse(payload.model_dump(), status_code=status)
    return payload
