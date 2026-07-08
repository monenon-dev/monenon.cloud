from __future__ import annotations

from tailor.apps.silicon_valley.adapter.inbound.api.schemas.piper_dinesh_dash_schema import DineshDashSchema
from tailor.apps.silicon_valley.app.dtos.piper_dinesh_dash_dto import DineshDashQuery, DineshDashResponse
from tailor.apps.silicon_valley.app.ports.input.piper_dinesh_dash_use_case import DineshDashUseCase
from tailor.apps.silicon_valley.app.ports.output.piper_dinesh_dash_port import DineshDashPort


class DineshDashInteractor(DineshDashUseCase):

    def __init__(self, repository: DineshDashPort):
        self.repository = repository

    async def introduce_myself(self, schema: DineshDashSchema) -> DineshDashResponse:
        '''딘에쉬 대시 자기소개 인터랙트'''

        return await self.repository.introduce_myself(DineshDashQuery(
            id=schema.id,
            name=schema.name,
        ))
