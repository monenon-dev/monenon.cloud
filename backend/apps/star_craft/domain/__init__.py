"""star_craft 도메인 — 스포크 노드, 라우팅 결과, 종족 온톨로지."""

from __future__ import annotations

from dataclasses import dataclass, field

from star_craft.domain.race_ontology import (
    RACE_ONTOLOGY,
    Race,
    RaceTool,
    ZERG_VISION_TOOLS,
    get_race,
    races_as_dict,
)

__all__ = [
    "SpokeNode",
    "RouteResult",
    "Race",
    "RaceTool",
    "RACE_ONTOLOGY",
    "ZERG_VISION_TOOLS",
    "get_race",
    "races_as_dict",
]


@dataclass
class SpokeNode:
    name: str
    description: str
    endpoint: str
    keywords: list[str] = field(default_factory=list)
    status: str = "active"
    race: str | None = None  # zerg | protoss | terran


@dataclass
class RouteResult:
    spoke: str
    confidence: float
    reason: str
    candidates: list[str] = field(default_factory=list)
