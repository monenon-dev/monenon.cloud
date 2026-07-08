from __future__ import annotations

from abc import ABC, abstractmethod

from sherlock_homes.app.dtos.criminal_eurus_prophet_dto import EurusProphetQuery, EurusProphetResponse


class EurusProphetPort(ABC):

    @abstractmethod
    def introduce_myself(self, query: EurusProphetQuery) -> EurusProphetResponse:
        '''유라루스 홈즈의 자기 소개 레포지토리 추상 메소드'''
        pass
