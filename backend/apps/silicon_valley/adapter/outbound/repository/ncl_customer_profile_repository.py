"""NCL 고객 프로필 인메모리 리포지토리 (요청마다 조회 — 캐시 없음)."""

from __future__ import annotations

from silicon_valley.app.ports.output.ncl_customer_profile_repository_port import (
    NclCustomerProfileRepositoryPort,
)
from silicon_valley.domain.customer_profile import CustomerProfile

_SEED: dict[str, CustomerProfile] = {
    "c-001": CustomerProfile(
        customer_id="c-001",
        preferred_destinations=("알래스카", "지중해"),
        cabin_class="발코니",
        budget_range="중간",
        recent_browsing=("알래스카 7박", "지중해 가족 패키지"),
        past_bookings=("캐리비안 5박 2024",),
    ),
    "c-002": CustomerProfile(
        customer_id="c-002",
        preferred_destinations=("북유럽",),
        cabin_class="오션뷰",
        budget_range="상",
        recent_browsing=("피요르드 항로",),
        past_bookings=(),
    ),
}


class NclCustomerProfileRepository(NclCustomerProfileRepositoryPort):
    """stub 시드 데이터. 이후 pgvector/ORM 구현으로 포트만 교체."""

    def __init__(self, store: dict[str, CustomerProfile] | None = None) -> None:
        self._store = dict(store if store is not None else _SEED)

    async def get_by_customer_id(self, customer_id: str) -> CustomerProfile | None:
        cid = (customer_id or "").strip()
        if not cid:
            return None
        return self._store.get(cid)
