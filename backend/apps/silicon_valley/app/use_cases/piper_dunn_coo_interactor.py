from __future__ import annotations

from tailor.apps.silicon_valley.adapter.inbound.api.schemas.piper_dunn_coo_schema import DunnCooSchema
from tailor.apps.silicon_valley.app.dtos.piper_dunn_coo_dto import DunnCooQuery, DunnCooResponse
from tailor.apps.silicon_valley.app.ports.input.piper_dunn_coo_use_case import DunnCooUseCase
from tailor.apps.silicon_valley.app.ports.output.piper_dunn_coo_port import DunnCooPort


class DunnCooInteractor(DunnCooUseCase):

    def __init__(self, repository: DunnCooPort):
        self.repository = repository

    async def introduce_myself(self, schema: DunnCooSchema) -> DunnCooResponse:
        '''재러드 던 COO 자기소개 인터랙트'''

        return await self.repository.introduce_myself(DunnCooQuery(
            id=schema.id,
            name=schema.name,
        ))
