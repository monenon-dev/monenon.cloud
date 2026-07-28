"""NCL 고객 선호도·탐색 기록 엔티티."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class CustomerProfile:
    customer_id: str
    preferred_destinations: tuple[str, ...] = ()
    cabin_class: str = ""
    budget_range: str = ""
    recent_browsing: tuple[str, ...] = ()
    past_bookings: tuple[str, ...] = field(default_factory=tuple)
