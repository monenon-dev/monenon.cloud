"""question_classifier 하네스 검증 단위 테스트."""

from __future__ import annotations

from moneyball.app.services.question_classifier import (
    heuristic_classify,
    parse_classification_payload,
)


def test_parse_accepts_moneyball_prefixed_spoke() -> None:
    data = {
        "entities": ["전북"],
        "intent": "home_stadium",
        "spokes": [
            {"id": "moneyball.stadium", "subquery": "전북 홈구장"},
            {"id": "team", "subquery": "전북"},
        ],
        "reason": "홈구장",
    }
    result = parse_classification_payload(data, "전북 홈구장은?", mode="test")
    assert result is not None
    assert result.intent == "home_stadium"
    assert result.entities == ["전북"]
    assert [s.id for s in result.spokes] == ["stadium", "team"]


def test_parse_rejects_unknown_spoke_only() -> None:
    data = {
        "intent": "general",
        "spokes": [{"id": "mail", "subquery": "x"}],
    }
    assert parse_classification_payload(data, "x", mode="test") is None


def test_parse_intent_allowlist_fallback() -> None:
    data = {
        "intent": "hack_the_planet",
        "spokes": [{"id": "team", "subquery": "울산"}],
    }
    result = parse_classification_payload(data, "울산", mode="test")
    assert result is not None
    assert result.intent == "general"


def test_heuristic_classify_home_stadium() -> None:
    result = heuristic_classify("전북 홈구장은 어디야?")
    assert result.mode == "heuristic"
    assert result.intent == "home_stadium"
    assert any(s.id == "stadium" for s in result.spokes)
    assert result.as_route()
