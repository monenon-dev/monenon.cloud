"""star_craft API v1 — Kerrigan(라우팅) + Raynor(스포크 레지스트리)."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from star_craft.app.use_cases import ContextRoutingUseCase
from star_craft.dependencies import get_routing_use_case
from star_craft.domain import SpokeNode

hub_router = APIRouter(prefix="/hub", tags=["star-craft-hub"])


class RouteRequest(BaseModel):
    query: str = Field(..., min_length=1)
    user_id: int | None = None


class SpokeRegisterBody(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    description: str
    endpoint: str
    keywords: list[str] = Field(default_factory=list)


# ── Kerrigan — 컨텍스트 라우팅 ───────────────────────────────────────────────

@hub_router.post("/route")
async def route_query(
    body: RouteRequest,
    use_case: ContextRoutingUseCase = Depends(get_routing_use_case),
) -> dict:
    """pgvector → Neo4j → EXAONE 3단계 라우팅."""
    result = await use_case.route(body.query)
    return {"spoke": result.spoke, "confidence": result.confidence,
            "reason": result.reason, "candidates": result.candidates}


@hub_router.post("/seed")
async def seed_hub(
    use_case: ContextRoutingUseCase = Depends(get_routing_use_case),
) -> dict:
    """허브 + 기본 스포크 초기 등록 (최초 1회)."""
    await use_case.seed()
    return {"ok": True, "message": "허브 및 기본 스포크 등록 완료"}


# ── Raynor — 스포크 레지스트리 ───────────────────────────────────────────────

@hub_router.get("/spokes")
async def list_spokes(
    use_case: ContextRoutingUseCase = Depends(get_routing_use_case),
) -> list[dict]:
    spokes = await use_case.get_spokes()
    return [{"name": s.name, "description": s.description,
             "endpoint": s.endpoint, "status": s.status} for s in spokes]


@hub_router.post("/spokes", status_code=201)
async def register_spoke(
    body: SpokeRegisterBody,
    use_case: ContextRoutingUseCase = Depends(get_routing_use_case),
) -> dict:
    await use_case.register_spoke(SpokeNode(
        name=body.name, description=body.description,
        endpoint=body.endpoint, keywords=body.keywords,
    ))
    return {"ok": True, "registered": body.name}
