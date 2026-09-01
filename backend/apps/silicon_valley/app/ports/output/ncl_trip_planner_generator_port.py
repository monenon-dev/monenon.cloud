"""NCL 여행 추천 생성 포트 (LangChain 구현은 outbound client)."""

from __future__ import annotations

from abc import ABC, abstractmethod

from silicon_valley.domain.customer_profile import CustomerProfile


class NclTripPlannerGeneratorPort(ABC):
    @abstractmethod
    async def plan(self, *, profile: CustomerProfile, question: str) -> str:
        """프로필 + 질문 → 맞춤형 여행 추천 텍스트."""
