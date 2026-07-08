from __future__ import annotations

from tailor.apps.silicon_valley.adapter.inbound.api.schemas.piper_bighetti_hr_schema import BighettiHrSchema
from tailor.apps.silicon_valley.app.dtos.piper_bighetti_hr_dto import BighettiHrQuery, BighettiHrResponse
from tailor.apps.silicon_valley.app.ports.input.piper_bighetti_hr_use_case import BighettiHrUseCase
from tailor.apps.silicon_valley.app.ports.output.piper_bighetti_hr_port import BighettiHrPort


class BighettiHrInteractor(BighettiHrUseCase):

    def __init__(self, repository: BighettiHrPort):
        self.repository = repository

    async def introduce_myself(self, schema: BighettiHrSchema) -> BighettiHrResponse:
        '''비게티 HR 자기소개 인터랙트'''

        return await self.repository.introduce_myself(BighettiHrQuery(
            id=schema.id,
            name=schema.name,
        ))
