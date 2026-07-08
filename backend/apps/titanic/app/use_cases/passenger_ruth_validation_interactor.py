from __future__ import annotations

from typing import Any

from titanic.adapter.inbound.api.schemas.passenger_ruth_validation_schema import RuthValidationSchema
from titanic.app.dto.passenger_ruth_validation_dto import RuthValidationQuery, RuthValidationResponse
from titanic.app.ports.input.passenger_ruth_validation_use_case import RuthValidationUseCase
from titanic.app.ports.output.passenger_ruth_validation_repository import RuthValidationRepository


class RuthValidationInteractor(RuthValidationUseCase):
    def __init__(self, repository: RuthValidationRepository) -> None:
        self.repository = repository

    async def introduce_myself(self, schema: RuthValidationSchema) -> RuthValidationResponse:
        return await self.repository.introduce_myself(
            RuthValidationQuery(id=schema.id, name=schema.name)
        )

    async def list_by_pclass(self, pclass: int, page: int, page_size: int) -> dict[str, Any]:
        total, items = await self.repository.list_by_pclass(pclass, page, page_size)
        return {
            "pclass": pclass,
            "page": page,
            "page_size": page_size,
            "total": total,
            "items": items,
        }
