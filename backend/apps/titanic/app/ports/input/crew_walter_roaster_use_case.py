from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from titanic.adapter.inbound.api.schemas.crew_walter_roaster_schema import WalterRoasterSchema
from titanic.app.dto.crew_walter_roaster_dto import WalterRoasterResponse


class WalterRoasterUseCase(ABC):
    @abstractmethod
    async def introduce_myself(self, schema: WalterRoasterSchema) -> WalterRoasterResponse:
        pass

    @abstractmethod
    async def list_passengers(self, skip: int = 0, limit: int = 50) -> list[dict[str, Any]]:
        pass

    @abstractmethod
    async def get_count(self) -> int:
        pass
