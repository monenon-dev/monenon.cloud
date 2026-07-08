from __future__ import annotations

from abc import ABC, abstractmethod

from sherlock_homes.app.dtos.police_lestrade_adapter_dto import LestradeAdapterQuery, LestradeAdapterResponse


class LestradeAdapterPort(ABC):

    @abstractmethod
    def introduce_myself(self, query: LestradeAdapterQuery) -> LestradeAdapterResponse:
        '''레스트레이드 경감의 자기 소개 레포지토리 추상 메소드'''
        pass
