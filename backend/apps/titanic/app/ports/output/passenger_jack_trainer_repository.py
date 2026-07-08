from __future__ import annotations

from abc import ABC, abstractmethod


from titanic.app.dto.passenger_jack_trainer_dto import JackTrainerQuery, JackTrainerResponse


class JackTrainerRepository(ABC):
    @abstractmethod
    async def introduce_myself(self, query: JackTrainerQuery) -> JackTrainerResponse:
        pass
