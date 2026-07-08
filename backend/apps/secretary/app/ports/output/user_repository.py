from __future__ import annotations

from abc import ABC, abstractmethod

from secretary.adapter.outbound.orm.user_model import User


class UserRepositoryPort(ABC):
    @abstractmethod
    async def count(self) -> int:
        ...

    @abstractmethod
    async def find_by_id(self, user_id: int) -> User | None:
        ...

    @abstractmethod
    async def find_by_email(self, email: str) -> User | None:
        ...

    @abstractmethod
    async def save(self, user: User) -> User:
        ...

    @abstractmethod
    async def list_all(self) -> list[User]:
        ...
