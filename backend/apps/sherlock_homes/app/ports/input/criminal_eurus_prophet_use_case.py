from __future__ import annotations

from abc import ABC, abstractmethod

from sherlock_homes.adapter.inbound.api.schemas.criminal_eurus_prophet_schema import EurusProphetSchema
from sherlock_homes.app.dtos.criminal_eurus_prophet_dto import EurusProphetResponse


class EurusProphetUseCase(ABC):

    @abstractmethod
    async def introduce_myself(self, schema: EurusProphetSchema) -> EurusProphetResponse:
        '''유라루스 홈즈의 자기소개 메소드'''
        pass
