from __future__ import annotations

from abc import ABC, abstractmethod

from sherlock_homes.adapter.inbound.api.schemas.police_lestrade_adapter_schema import LestradeAdapterSchema
from sherlock_homes.app.dtos.police_lestrade_adapter_dto import LestradeAdapterResponse


class LestradeAdapterUseCase(ABC):

    @abstractmethod
    async def introduce_myself(self, schema: LestradeAdapterSchema) -> LestradeAdapterResponse:
        '''레스트레이드 경감의 자기소개 메소드'''
        pass
