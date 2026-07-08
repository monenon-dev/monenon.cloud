from __future__ import annotations

from typing import Any

from titanic.adapter.inbound.api.schemas.crew_walter_roaster_schema import WalterRoasterSchema
from titanic.app.dto.crew_walter_roaster_dto import WalterRoasterQuery, WalterRoasterResponse
from titanic.app.ports.input.crew_walter_roaster_use_case import WalterRoasterUseCase
from titanic.app.ports.output.crew_walter_roaster_repository import WalterRoasterRepository


class WalterRoasterInteractor(WalterRoasterUseCase):
    def __init__(self, repository: WalterRoasterRepository) -> None:
        self.repository = repository

    async def introduce_myself(self, schema: WalterRoasterSchema) -> WalterRoasterResponse:
        return await self.repository.introduce_myself(
            WalterRoasterQuery(id=schema.id, name=schema.name)
        )

    async def list_passengers(self, skip: int = 0, limit: int = 50) -> list[dict[str, Any]]:
        return await self.repository.list_passengers(skip=skip, limit=limit)

    async def get_count(self) -> int:
        return await self.repository.get_count()
