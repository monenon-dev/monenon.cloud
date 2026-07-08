"""faker API v1 — 오케스트레이터 dispatch 엔드포인트."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from faker.app.use_cases import dispatch

faker_router = APIRouter(prefix="/faker", tags=["faker-orchestrator"])


class DispatchRequest(BaseModel):
    query: str = Field(..., min_length=1, description="사용자 요청")
    user_id: int | None = None


@faker_router.post("/dispatch")
async def dispatch_task(body: DispatchRequest) -> dict:
    """
    n8n → 이 엔드포인트 → LangGraph → star_craft 라우팅 → 스포크 실행.
    EXAONE이 오케스트레이터 역할.
    """
    return await dispatch(body.query, body.user_id)
