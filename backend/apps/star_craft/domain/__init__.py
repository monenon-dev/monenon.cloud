"""star_craft 도메인 — 스포크 노드, 라우팅 결과 엔티티."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class SpokeNode:
    name: str
    description: str
    endpoint: str
    keywords: list[str] = field(default_factory=list)
    status: str = "active"


@dataclass
class RouteResult:
    spoke: str
    confidence: float
    reason: str
    candidates: list[str] = field(default_factory=list)
