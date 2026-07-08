from __future__ import annotations

from abc import ABC, abstractmethod

from tailor.apps.silicon_valley.adapter.inbound.api.schemas.piper_dinesh_dash_schema import DineshDashSchema
from tailor.apps.silicon_valley.app.dtos.piper_dinesh_dash_dto import DineshDashResponse


class DineshDashUseCase(ABC):

    @abstractmethod
    def introduce_myself(self, schema: DineshDashSchema) -> DineshDashResponse:
        '''딘에쉬 대시의 자기소개 메소드'''
        pass
