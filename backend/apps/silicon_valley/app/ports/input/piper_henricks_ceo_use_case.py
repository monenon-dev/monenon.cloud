from __future__ import annotations

from abc import ABC, abstractmethod

from tailor.apps.silicon_valley.adapter.inbound.api.schemas.piper_henricks_ceo_schema import HenricksCeoSchema
from tailor.apps.silicon_valley.app.dtos.piper_henricks_ceo_dto import HenricksCeoResponse


class HenricksCeoUseCase(ABC):

    @abstractmethod
    def introduce_myself(self, schema: HenricksCeoSchema) -> HenricksCeoResponse:
        '''리차드 헨드릭스 CEO의 자기소개 메소드'''
        pass
