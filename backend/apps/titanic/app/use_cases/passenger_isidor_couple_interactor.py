from __future__ import annotations

from titanic.adapter.inbound.api.schemas.passenger_isidor_couple_schema import IsidorCoupleSchema
from titanic.app.dto.passenger_isidor_couple_dto import IsidorCoupleQuery, IsidorCoupleResponse
from titanic.app.ports.input.passenger_isidor_couple_use_case import IsidorCoupleUseCase
from titanic.app.ports.output.passenger_isidor_couple_repository import IsidorCoupleRepository


class IsidorCoupleInteractor(IsidorCoupleUseCase):
    def __init__(self, repository: IsidorCoupleRepository) -> None:
        self.repository = repository

    async def introduce_myself(self, schema: IsidorCoupleSchema) -> IsidorCoupleResponse:
        return await self.repository.introduce_myself(
            IsidorCoupleQuery(id=schema.id, name=schema.name)
        )
