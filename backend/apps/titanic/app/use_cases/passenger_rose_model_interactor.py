from __future__ import annotations

from typing import Any

from titanic.adapter.inbound.api.schemas.passenger_rose_model_schema import RoseModelSchema
from titanic.app.dto.passenger_rose_model_dto import RoseModelQuery, RoseModelResponse
from titanic.app.ports.input.passenger_rose_model_use_case import RoseModelUseCase
from titanic.app.ports.output.passenger_rose_model_repository import RoseModelRepository


class RoseModelInteractor(RoseModelUseCase):
    def __init__(self, repository: RoseModelRepository) -> None:
        self.repository = repository

    async def introduce_myself(self, schema: RoseModelSchema) -> RoseModelResponse:
        return await self.repository.introduce_myself(
            RoseModelQuery(id=schema.id, name=schema.name)
        )

    async def analyze_rose_survival(self) -> dict[str, Any]:
        records = await self.repository.get_all_records()
        return {"count": len(records)}

    async def predict_survival(self, passenger_data: dict[str, Any]) -> dict[str, Any]:
        return {"input": passenger_data, "prediction": None}
