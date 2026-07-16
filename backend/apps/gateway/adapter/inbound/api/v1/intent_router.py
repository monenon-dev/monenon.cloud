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


@gateway_router.post("/intent", response_model=IntentRouteResponse)
async def route_intent(body: IntentRouteRequest) -> IntentRouteResponse:
    """
    시맨틱 인텐트 입구 필터.
    EXAONE을 호출하지 않고 nomic-embed 프로토타입 유사도로만 라벨링한다.
    """
    result = await intent_router.route(body.query)
    logger.info(
        "[gateway] intent=%s conf=%.3f handler=%s reason=%s",
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
    )
