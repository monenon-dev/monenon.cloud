"""Gateway 입구 인텐트 라우팅 API."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Query
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
    backend: str = "local"


async def _route_intent_impl(query: str) -> IntentRouteResponse:
    import os

    result = await intent_router.route(query)
    backend = os.getenv("GATEWAY_INTENT_BACKEND", "local")
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


@gateway_router.get("/health")
async def gateway_health() -> dict:
    """라우터 등록 확인용."""
    import os

    from lol.config import get_poc_hub_model

    return {
        "ok": True,
        "backend": os.getenv("GATEWAY_INTENT_BACKEND", "local"),
        "hub_model": get_poc_hub_model(),
        "intent_path": "/api/gateway/intent",
        "qlora_required_for_router": False,
    }


@gateway_router.post("/intent", response_model=IntentRouteResponse)
async def route_intent_post(body: IntentRouteRequest) -> IntentRouteResponse:
    """
    시맨틱 인텐트 입구 필터 (POST).
    PoC: Qwen2.5-1.5B를 INGRESS_CLASSIFIER 역할로만 호출 (QLoRA 불필요).
    """
    return await _route_intent_impl(body.query)


@gateway_router.get("/intent", response_model=IntentRouteResponse)
async def route_intent_get(
    query: str = Query(..., min_length=1, max_length=2000),
) -> IntentRouteResponse:
    """브라우저·간단 테스트용 GET (POST와 동일)."""
    return await _route_intent_impl(query)
