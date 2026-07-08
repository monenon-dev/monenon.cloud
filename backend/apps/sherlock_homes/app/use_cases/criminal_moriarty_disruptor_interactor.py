from __future__ import annotations

from sherlock_homes.adapter.inbound.api.schemas.criminal_moriarty_disruptor_schema import MoriartyDisruptorSchema
from sherlock_homes.app.dtos.criminal_moriarty_disruptor_dto import MoriartyDisruptorQuery, MoriartyDisruptorResponse
from sherlock_homes.app.ports.input.criminal_moriarty_disruptor_use_case import MoriartyDisruptorUseCase
from sherlock_homes.app.ports.output.criminal_moriarty_disruptor_port import MoriartyDisruptorPort


class MoriartyDisruptorInteractor(MoriartyDisruptorUseCase):

    def __init__(self, repository: MoriartyDisruptorPort):
        self.repository = repository

    async def introduce_myself(self, schema: MoriartyDisruptorSchema) -> MoriartyDisruptorResponse:
        '''모리어티의 자기소개 인터렉트'''
        return await self.repository.introduce_myself(MoriartyDisruptorQuery(
            id=schema.id,
            name=schema.name
        ))
