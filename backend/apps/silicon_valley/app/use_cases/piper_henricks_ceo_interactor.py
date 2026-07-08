from __future__ import annotations

from tailor.apps.silicon_valley.adapter.inbound.api.schemas.piper_henricks_ceo_schema import HenricksCeoSchema
from tailor.apps.silicon_valley.app.dtos.piper_henricks_ceo_dto import HenricksCeoQuery, HenricksCeoResponse
from tailor.apps.silicon_valley.app.ports.input.piper_henricks_ceo_use_case import HenricksCeoUseCase
from tailor.apps.silicon_valley.app.ports.output.piper_henricks_ceo_port import HenricksCeoPort


class HenricksCeoInteractor(HenricksCeoUseCase):

    def __init__(self, repository: HenricksCeoPort):
        self.repository = repository

    async def introduce_myself(self, schema: HenricksCeoSchema) -> HenricksCeoResponse:
        '''리차드 헨드릭스 CEO 자기소개 인터랙트'''

        return await self.repository.introduce_myself(HenricksCeoQuery(
            id=schema.id,
            name=schema.name,
        ))
