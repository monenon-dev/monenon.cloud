from __future__ import annotations

from abc import ABC, abstractmethod


from titanic.app.dto.crew_james_director_dto import (
    BookingCommand,
    JamesDirectorQuery,
    JamesDirectorResponse,
    PersonCommand,
)


class JamesDirectorRepository(ABC):
    @abstractmethod
    async def introduce_myself(self, query: JamesDirectorQuery) -> JamesDirectorResponse:
        pass

    @abstractmethod
    async def receive_uploaded_records(
        self,
        person_commands: list[PersonCommand],
        booking_commands: list[BookingCommand],
    ) -> int:
        pass
