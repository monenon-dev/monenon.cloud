from __future__ import annotations

from dataclasses import dataclass

from gateway.domain.intents import IngressIntent


@dataclass(frozen=True)
class IntentRouteResult:
    intent: IngressIntent
    confidence: float
    handler: str
    scores: dict[str, float]
    reason: str
