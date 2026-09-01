"""입구 시맨틱 인텐트 라우터 출력 포트."""

from __future__ import annotations

from abc import ABC, abstractmethod

from gateway.domain.route_result import IntentRouteResult


class IntentRouterPort(ABC):
    @abstractmethod
    async def route(self, query: str) -> IntentRouteResult:
        """라벨+confidence만 반환. 답변 문장 생성 금지."""
