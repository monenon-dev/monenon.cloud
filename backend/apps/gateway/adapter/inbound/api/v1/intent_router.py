"""Gateway 입구 인텐트 라우팅 API."""

from __future__ import annotations

import logging

from fastapi import APIRouter
from pydantic import BaseModel, Field

from gateway.app.services.intent_router import intent_router

logger = logging.getLogger(__name__)

gateway_router = APIRouter(prefix="/gateway", tags=["gateway"])


class IntentRouteRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)


class IntentRouteResponse(BaseModel):
    intent: str
    confidence: float
    handler: str
    scores: dict[str, float]
    reason: str
    backend: str = "exaone"


@gateway_router.post("/intent", response_model=IntentRouteResponse)
async def route_intent(body: IntentRouteRequest) -> IntentRouteResponse:
    """
    시맨틱 인텐트 입구 필터.
    기본: 기존 EXAONE 7.8B를 INGRESS_CLASSIFIER 역할로만 호출 (추가 다운로드 없음).
    GATEWAY_INTENT_BACKEND=nomic 이면 임베딩 프로토타입.
    """
    import os

    result = await intent_router.route(body.query)
    backend = os.getenv("GATEWAY_INTENT_BACKEND", "exaone")
    logger.info(
        "[gateway] backend=%s intent=%s conf=%.3f handler=%s reason=%s",
        backend,
        result.intent,
        result.confidence,
        result.handler,
        result.reason,
    )
    return IntentRouteResponse(
        intent=result.intent.value,
        confidence=result.confidence,
        handler=result.handler,
        scores=result.scores,
        reason=result.reason,
        backend=backend,
    )
