from __future__ import annotations

from abc import ABC, abstractmethod

from sherlock_homes.adapter.inbound.api.schemas.police_anderson_collector_schema import AndersonCollectorSchema
from sherlock_homes.app.dtos.police_anderson_collector_dto import AndersonCollectorResponse


class AndersonCollectorUseCase(ABC):

    @abstractmethod
    async def introduce_myself(self, schema: AndersonCollectorSchema) -> AndersonCollectorResponse:
        '''앤더슨의 자기소개 메소드'''
        pass
