"""시맨틱 채팅 HTTP 스키마."""

from __future__ import annotations

from pydantic import BaseModel, Field


class SemanticChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000, description="사용자 전송 메시지")
    customer_id: str | None = Field(
        default="c-001",
        max_length=64,
        description="NCL 프로필 조회용 (없으면 c-001)",
    )


class SemanticChatResponse(BaseModel):
    ok: bool
    intent: str
    handler: str
    confidence: float
    channel: str
    reply: str
    reason: str = ""
