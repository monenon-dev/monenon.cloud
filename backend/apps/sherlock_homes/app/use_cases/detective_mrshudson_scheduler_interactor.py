from __future__ import annotations

from sherlock_homes.adapter.inbound.api.schemas.detective_mrshudson_scheduler_schema import MrshudsonSchedulerSchema
from sherlock_homes.app.dtos.detective_mrshudson_scheduler_dto import MrshudsonSchedulerQuery, MrshudsonSchedulerResponse
from sherlock_homes.app.ports.input.detective_mrshudson_scheduler_use_case import MrshudsonSchedulerUseCase
from sherlock_homes.app.ports.output.detective_mrshudson_scheduler_port import MrshudsonSchedulerPort


class MrshudsonSchedulerInteractor(MrshudsonSchedulerUseCase):

    def __init__(self, repository: MrshudsonSchedulerPort):
        self.repository = repository

    async def introduce_myself(self, schema: MrshudsonSchedulerSchema) -> MrshudsonSchedulerResponse:
        '''허드슨 부인의 자기소개 인터렉트'''
        return await self.repository.introduce_myself(MrshudsonSchedulerQuery(
            id=schema.id,
            name=schema.name
        ))
