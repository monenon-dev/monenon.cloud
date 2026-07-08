from __future__ import annotations

from abc import ABC, abstractmethod

from sherlock_homes.app.dtos.criminal_irene_ilustrator_dto import IreneIlustratorQuery, IreneIlustratorResponse


class IreneIlustratorPort(ABC):

    @abstractmethod
    def introduce_myself(self, query: IreneIlustratorQuery) -> IreneIlustratorResponse:
        '''아이린 애들러의 자기 소개 레포지토리 추상 메소드'''
        pass
