from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from titanic.adapter.inbound.api.schemas.passenger_ruth_validation_schema import RuthValidationSchema
from titanic.app.dto.passenger_ruth_validation_dto import RuthValidationResponse


class RuthValidationUseCase(ABC):

    @abstractmethod
    async def introduce_myself(self, schema: RuthValidationSchema) -> RuthValidationResponse:
        ...

    @abstractmethod
    async def list_by_pclass(self, pclass: int, page: int, page_size: int) -> dict[str, Any]:
        ...