from __future__ import annotations

from abc import ABC, abstractmethod

from tailor.apps.silicon_valley.app.dtos.piper_bighetti_hr_dto import BighettiHrQuery, BighettiHrResponse


class BighettiHrPort(ABC):

    @abstractmethod
    def introduce_myself(self, query: BighettiHrQuery) -> BighettiHrResponse:
        '''비게티 HR 레포지터리 추상 메소드'''
        pass
