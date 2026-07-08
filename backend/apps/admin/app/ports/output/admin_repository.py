from __future__ import annotations

from abc import ABC, abstractmethod

from admin.adapter.outbound.orm.admin_account import AdminAccount
from admin.adapter.outbound.orm.warning import Warning
from secretary.adapter.outbound.orm.user_model import User, UserRole


class AdminRepositoryPort(ABC):
    @abstractmethod
    async def find_user_by_id(self, user_id: int) -> User | None:
        ...

    @abstractmethod
    async def find_user_by_email(self, email: str) -> User | None:
        ...

    @abstractmethod
    async def list_users(self) -> list[User]:
        ...

    @abstractmethod
    async def list_users_by_role(self, role: UserRole) -> list[User]:
        ...

    @abstractmethod
    async def save_user(self, user: User) -> User:
        ...

    @abstractmethod
    async def delete_user(self, user: User) -> None:
        ...

    @abstractmethod
    async def find_system_admin(self) -> AdminAccount | None:
        ...

    @abstractmethod
    async def find_system_admin_by_email(self, email: str) -> AdminAccount | None:
        ...

    @abstractmethod
    async def save_system_admin(self, admin: AdminAccount) -> AdminAccount:
        ...

    @abstractmethod
    async def add_warning(self, admin_id: int, user_id: int, message: str) -> Warning:
        ...

    @abstractmethod
    async def list_warnings_for_user(self, user_id: int) -> list[Warning]:
        ...
