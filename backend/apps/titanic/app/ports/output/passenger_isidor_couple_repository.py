from __future__ import annotations

from abc import ABC, abstractmethod


from titanic.app.dto.passenger_isidor_couple_dto import IsidorCoupleQuery, IsidorCoupleResponse


class IsidorCoupleRepository(ABC):
    @abstractmethod
    async def introduce_myself(self, query: IsidorCoupleQuery) -> IsidorCoupleResponse:
        """이시도르 부부 자기소개 레포지토리 추상 메소드"""
        ...
