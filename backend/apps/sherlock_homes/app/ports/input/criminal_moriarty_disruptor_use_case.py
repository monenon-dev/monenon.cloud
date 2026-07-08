from __future__ import annotations

from abc import ABC, abstractmethod

from sherlock_homes.adapter.inbound.api.schemas.criminal_moriarty_disruptor_schema import MoriartyDisruptorSchema
from sherlock_homes.app.dtos.criminal_moriarty_disruptor_dto import MoriartyDisruptorResponse


class MoriartyDisruptorUseCase(ABC):

    @abstractmethod
    async def introduce_myself(self, schema: MoriartyDisruptorSchema) -> MoriartyDisruptorResponse:
        '''모리어티의 자기소개 메소드'''
        pass
