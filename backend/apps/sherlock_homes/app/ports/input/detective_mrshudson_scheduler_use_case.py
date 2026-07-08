from __future__ import annotations

from abc import ABC, abstractmethod

from sherlock_homes.adapter.inbound.api.schemas.detective_mrshudson_scheduler_schema import MrshudsonSchedulerSchema
from sherlock_homes.app.dtos.detective_mrshudson_scheduler_dto import MrshudsonSchedulerResponse


class MrshudsonSchedulerUseCase(ABC):

    @abstractmethod
    async def introduce_myself(self, schema: MrshudsonSchedulerSchema) -> MrshudsonSchedulerResponse:
        '''허드슨 부인의 자기소개 메소드'''
        pass
