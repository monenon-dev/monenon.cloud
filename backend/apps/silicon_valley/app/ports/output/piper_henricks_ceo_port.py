from __future__ import annotations

from abc import ABC, abstractmethod

from tailor.apps.silicon_valley.app.dtos.piper_henricks_ceo_dto import HenricksCeoQuery, HenricksCeoResponse


class HenricksCeoPort(ABC):

    @abstractmethod
    def introduce_myself(self, query: HenricksCeoQuery) -> HenricksCeoResponse:
        '''리차드 헨드릭스 CEO 레포지터리 추상 메소드'''
        pass
