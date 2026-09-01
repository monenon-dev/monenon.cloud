"""전송 → 시맨틱 의도 → LangChain 엔진 파이프라인 입구.

참조 패턴: star_craft semantic_router (의도 판별 후 엔진 위임).
Monenon: silicon_valley spoke + langchain-harness.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends

from silicon_valley.adapter.inbound.api.schemas.semantic_chat_schema import (
    SemanticChatRequest,
    SemanticChatResponse,
)
from silicon_valley.app.dto.semantic_chat_dto import SemanticChatQuery
from silicon_valley.app.ports.input.semantic_chat_use_case import SemanticChatUseCase
from silicon_valley.dependencies.semantic_chat_provider import get_semantic_chat_use_case

logger = logging.getLogger(__name__)

semantic_router = APIRouter(prefix="/semantic", tags=["silicon-valley-semantic"])


@semantic_router.post("/chat", response_model=SemanticChatResponse)
async def semantic_chat(
    body: SemanticChatRequest,
    use_case: SemanticChatUseCase = Depends(get_semantic_chat_use_case),
) -> SemanticChatResponse:
    """프론트 전송 버튼 → 시맨틱 의도 → NCL/Morningstar/Elastic 채널."""
    result = await use_case.chat(
        SemanticChatQuery(message=body.message, customer_id=body.customer_id)
    )
    logger.info(
        "[silicon_valley/semantic] intent=%s channel=%s conf=%.3f ok=%s",
        result.intent,
        result.channel,
        result.confidence,
        result.ok,
    )
    return SemanticChatResponse(
        ok=result.ok,
        intent=result.intent,
        handler=result.handler,
        confidence=result.confidence,
        channel=result.channel,
        reply=result.reply,
        reason=result.reason,
    )
