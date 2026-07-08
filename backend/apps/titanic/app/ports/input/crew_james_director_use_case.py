from __future__ import annotations

from abc import ABC, abstractmethod

from titanic.adapter.inbound.api.schemas.crew_james_director_schema import JamesDirectorSchema, TitanicRecordSchema
from titanic.app.dto.crew_james_director_dto import JamesDirectorResponse


class JamesDirectorUseCase(ABC):
    @abstractmethod
    async def introduce_myself(self, schema: JamesDirectorSchema) -> JamesDirectorResponse:
        pass

    @abstractmethod
    async def upload_titanic_file(self, schema: list[TitanicRecordSchema]) -> dict:
        pass
