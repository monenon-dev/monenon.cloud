from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


from titanic.app.dto.crew_walter_roaster_dto import WalterRoasterQuery, WalterRoasterResponse


class WalterRoasterRepository(ABC):
    @abstractmethod
    async def introduce_myself(self, query: WalterRoasterQuery) -> WalterRoasterResponse:
        pass

    @abstractmethod
    async def list_passengers(self, skip: int = 0, limit: int = 50) -> list[dict[str, Any]]:
        pass

    @abstractmethod
    async def get_count(self) -> int:
        pass
