from __future__ import annotations

from typing import Any

from titanic.adapter.inbound.api.schemas.passenger_molly_scaler_schema import MollyScalerSchema
from titanic.app.dto.passenger_molly_scaler_dto import MollyScalerQuery, MollyScalerResponse
from titanic.app.ports.input.passenger_molly_scaler_use_case import MollyScalerUseCase
from titanic.app.ports.output.passenger_molly_scaler_repository import MollyScalerRepository


class MollyScalerInteractor(MollyScalerUseCase):
    def __init__(self, repository: MollyScalerRepository) -> None:
        self.repository = repository

    async def introduce_myself(self, schema: MollyScalerSchema) -> MollyScalerResponse:
        return await self.repository.introduce_myself(
            MollyScalerQuery(id=schema.id, name=schema.name)
        )

    async def scale_features(self, data: dict[str, Any]) -> dict[str, Any]:
        return {"scaled": data}
