"""시맨틱 채팅 DTO."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SemanticChatQuery:
    message: str
    customer_id: str | None = None


@dataclass(frozen=True)
class SemanticChatResult:
    ok: bool
    intent: str
    handler: str
    confidence: float
    reply: str
    channel: str
    reason: str = ""
