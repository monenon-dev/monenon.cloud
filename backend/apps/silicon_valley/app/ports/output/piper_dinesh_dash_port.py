from __future__ import annotations

from abc import ABC, abstractmethod

from tailor.apps.silicon_valley.app.dtos.piper_dinesh_dash_dto import DineshDashQuery, DineshDashResponse


class DineshDashPort(ABC):

    @abstractmethod
    def introduce_myself(self, query: DineshDashQuery) -> DineshDashResponse:
        '''딘에쉬 대시 레포지터리 추상 메소드'''
        pass
