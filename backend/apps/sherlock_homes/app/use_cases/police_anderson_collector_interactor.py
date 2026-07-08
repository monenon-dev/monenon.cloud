from __future__ import annotations

from sherlock_homes.adapter.inbound.api.schemas.police_anderson_collector_schema import AndersonCollectorSchema
from sherlock_homes.app.dtos.police_anderson_collector_dto import AndersonCollectorQuery, AndersonCollectorResponse
from sherlock_homes.app.ports.input.police_anderson_collector_use_case import AndersonCollectorUseCase
from sherlock_homes.app.ports.output.police_anderson_collector_port import AndersonCollectorPort


class AndersonCollectorInteractor(AndersonCollectorUseCase):

    def __init__(self, repository: AndersonCollectorPort):
        self.repository = repository

    async def introduce_myself(self, schema: AndersonCollectorSchema) -> AndersonCollectorResponse:
        '''앤더슨의 자기소개 인터렉트'''
        return await self.repository.introduce_myself(AndersonCollectorQuery(
            id=schema.id,
            name=schema.name
        ))
