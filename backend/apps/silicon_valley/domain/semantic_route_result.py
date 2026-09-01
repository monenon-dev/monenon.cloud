"""시맨틱 라우팅 결과."""

from __future__ import annotations

from dataclasses import dataclass, field

from silicon_valley.domain.langchain_intent import LangchainSpokeIntent


@dataclass(frozen=True)
class SemanticRouteResult:
    intent: LangchainSpokeIntent
    confidence: float
    handler: str
    scores: dict[str, float] = field(default_factory=dict)
    reason: str = ""
