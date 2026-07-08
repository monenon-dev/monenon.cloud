from __future__ import annotations

from tailor.apps.silicon_valley.adapter.inbound.api.schemas.piper_gilfoyle_sys_schema import GilfoyleSysSchema
from tailor.apps.silicon_valley.app.dtos.piper_gilfoyle_sys_dto import GilfoyleSysQuery, GilfoyleSysResponse
from tailor.apps.silicon_valley.app.ports.input.piper_gilfoyle_sys_use_case import GilfoyleSysUseCase
from tailor.apps.silicon_valley.app.ports.output.piper_gilfoyle_sys_port import GilfoyleSysPort


class GilfoyleSysInteractor(GilfoyleSysUseCase):

    def __init__(self, repository: GilfoyleSysPort):
        self.repository = repository

    async def introduce_myself(self, schema: GilfoyleSysSchema) -> GilfoyleSysResponse:
        '''길포일 시스템 자기소개 인터랙트'''

        return await self.repository.introduce_myself(GilfoyleSysQuery(
            id=schema.id,
            name=schema.name,
        ))
