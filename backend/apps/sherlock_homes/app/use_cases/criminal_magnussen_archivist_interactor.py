from __future__ import annotations

from sherlock_homes.adapter.inbound.api.schemas.criminal_magnussen_archivist_schema import MagnussenArchivistSchema
from sherlock_homes.app.dtos.criminal_magnussen_archivist_dto import MagnussenArchivistQuery, MagnussenArchivistResponse
from sherlock_homes.app.ports.input.criminal_magnussen_archivist_use_case import MagnussenArchivistUseCase
from sherlock_homes.app.ports.output.criminal_magnussen_archivist_port import MagnussenArchivistPort


class MagnussenArchivistInteractor(MagnussenArchivistUseCase):

    def __init__(self, repository: MagnussenArchivistPort):
        self.repository = repository

    async def introduce_myself(self, schema: MagnussenArchivistSchema) -> MagnussenArchivistResponse:
        '''마그누센의 자기소개 인터렉트'''
        return await self.repository.introduce_myself(MagnussenArchivistQuery(
            id=schema.id,
            name=schema.name
        ))
