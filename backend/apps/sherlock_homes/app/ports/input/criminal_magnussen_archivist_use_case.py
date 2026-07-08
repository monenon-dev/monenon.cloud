from __future__ import annotations

from abc import ABC, abstractmethod

from sherlock_homes.adapter.inbound.api.schemas.criminal_magnussen_archivist_schema import MagnussenArchivistSchema
from sherlock_homes.app.dtos.criminal_magnussen_archivist_dto import MagnussenArchivistResponse


class MagnussenArchivistUseCase(ABC):

    @abstractmethod
    async def introduce_myself(self, schema: MagnussenArchivistSchema) -> MagnussenArchivistResponse:
        '''마그누센의 자기소개 메소드'''
        pass
