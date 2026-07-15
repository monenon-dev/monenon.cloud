"""Moneyball 스타 채팅 요청/응답 스키마."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class MoneyballChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class MoneyballChatStep(BaseModel):
    spoke: Literal["stadium", "team", "player", "schedule"]
    subquery: str
    sql: str
    row_count: int = 0
    rows_preview: list[dict[str, Any]] = Field(default_factory=list)
    error: str | None = None
    sql_mode: str | None = None


class MoneyballChatResponse(BaseModel):
    ok: bool
    reply: str
    hub_model: str
    spoke_model: str
    route: list[str] = Field(default_factory=list)
    steps: list[MoneyballChatStep] = Field(default_factory=list)
    mode: str = "heuristic"
    detail: str | None = None
