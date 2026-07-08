from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from titanic.adapter.inbound.api.schemas.passenger_molly_scaler_schema import MollyScalerSchema
from titanic.app.dto.passenger_molly_scaler_dto import MollyScalerResponse


class MollyScalerUseCase(ABC):

    @abstractmethod
    async def introduce_myself(self, schema: MollyScalerSchema) -> MollyScalerResponse:
        ...

    @abstractmethod
    async def scale_features(self, data: dict[str, Any]) -> dict[str, Any]:
        ...