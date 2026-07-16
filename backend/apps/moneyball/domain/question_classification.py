"""Moneyball 질문 분류 결과 — 의사 분류기 출력 (답변 아님)."""

from __future__ import annotations

from dataclasses import dataclass, field

from moneyball.app.ontology.star import SpokeId

INTENT_ALLOWLIST: frozenset[str] = frozenset(
    {
        "home_stadium",
        "team_info",
        "player_info",
        "schedule",
        "general",
    }
)


@dataclass(frozen=True)
class SpokeSubquery:
    id: SpokeId
    subquery: str


@dataclass(frozen=True)
class QuestionClassification:
    """파서 전용 결과. 최종 답변 문장을 담지 않는다."""

    entities: list[str] = field(default_factory=list)
    intent: str = "general"
    spokes: list[SpokeSubquery] = field(default_factory=list)
    reason: str = ""
    mode: str = "heuristic"

    def as_route(self) -> list[dict[str, str]]:
        return [{"id": s.id, "subquery": s.subquery} for s in self.spokes]
