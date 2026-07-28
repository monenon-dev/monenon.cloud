"""NCL 고객 프로필 조회 포트."""

from __future__ import annotations

from abc import ABC, abstractmethod

from silicon_valley.domain.customer_profile import CustomerProfile


class NclCustomerProfileRepositoryPort(ABC):
    @abstractmethod
    async def get_by_customer_id(self, customer_id: str) -> CustomerProfile | None:
        """요청 시점마다 최신 프로필 조회 (캐시 금지)."""
