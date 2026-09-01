"""pick_intent 하네스 단위 테스트 (임베딩 없이)."""

from __future__ import annotations

from gateway.app.services.intent_router import cosine_similarity, pick_intent
from gateway.domain.intents import IngressIntent


def test_cosine_identical() -> None:
    v = [1.0, 0.0, 0.0]
    assert abs(cosine_similarity(v, v) - 1.0) < 1e-6


def test_pick_intent_below_threshold_clarify() -> None:
    scores = {
        IngressIntent.CRUD: 0.2,
        IngressIntent.GEMINI: 0.25,
        IngressIntent.EXAONE_RAG: 0.3,
    }
    intent, conf, reason = pick_intent(scores, min_confidence=0.42)
    assert intent == IngressIntent.CLARIFY
    assert reason == "below_threshold"
    assert conf == 0.3


def test_pick_intent_security_wins() -> None:
    scores = {
        IngressIntent.CRUD: 0.4,
        IngressIntent.SECURITY: 0.81,
        IngressIntent.GEMINI: 0.5,
    }
    intent, conf, reason = pick_intent(scores, min_confidence=0.42)
    assert intent == IngressIntent.SECURITY
    assert conf == 0.81
    assert reason == "prototype_match"
