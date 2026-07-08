from __future__ import annotations

from abc import ABC, abstractmethod

from sherlock_homes.adapter.inbound.api.schemas.irene_courier_schema import IreneCourierSchema
from sherlock_homes.app.dtos.irene_courier_dto import IreneCourierResponse


class IreneCourierUseCase(ABC):

    @abstractmethod
    async def send_email(self, schema: IreneCourierSchema) -> IreneCourierResponse:
        pass
