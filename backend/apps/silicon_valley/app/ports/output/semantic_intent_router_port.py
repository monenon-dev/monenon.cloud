"""시맨틱 인텐트 라우터 포트."""

from __future__ import annotations

from abc import ABC, abstractmethod

from silicon_valley.domain.semantic_route_result import SemanticRouteResult


class SemanticIntentRouterPort(ABC):
    @abstractmethod
    async def route(self, message: str) -> SemanticRouteResult:
        """사용자 메시지 → 엔진 인텐트."""
