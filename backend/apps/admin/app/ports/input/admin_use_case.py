from __future__ import annotations

from abc import ABC, abstractmethod

from admin.adapter.inbound.api.schemas.admin_schema import (
    AdminCreate,
    AdminDashboardOverview,
    AdminResponse,
    AdminUserCreate,
    AdminUserSettingRow,
    WarningCreate,
    WarningResponse,
    WarningSendResult,
)
from admin.adapter.outbound.orm.admin_account import AdminAccount
from secretary.adapter.outbound.orm.user_model import User


class AdminUseCasePort(ABC):
    @abstractmethod
    def to_user_response(self, user: User) -> AdminResponse:
        ...

    @abstractmethod
    def to_admin_response(self, admin: AdminAccount) -> AdminResponse:
        ...

    @abstractmethod
    async def create_user(self, data: AdminUserCreate) -> AdminResponse:
        ...

    @abstractmethod
    async def list_all(self) -> list[AdminResponse]:
        ...

    @abstractmethod
    async def list_admins(self) -> list[AdminResponse]:
        ...

    @abstractmethod
    async def list_members(self) -> list[AdminResponse]:
        ...

    @abstractmethod
    async def list_member_user_settings(self) -> list[AdminUserSettingRow]:
        ...

    @abstractmethod
    async def get_dashboard_overview(self) -> AdminDashboardOverview:
        ...

    @abstractmethod
    async def mark_risk_processed(self, warning_id: int) -> None:
        ...

    @abstractmethod
    async def withdraw_member(self, user_id: int) -> None:
        ...

    @abstractmethod
    async def send_warning(self, user_id: int, data: WarningCreate) -> WarningSendResult:
        ...

    @abstractmethod
    async def unsuspend_member(self, user_id: int) -> AdminResponse:
        ...

    @abstractmethod
    async def list_warnings_for_user(self, user_id: int) -> list[WarningResponse]:
        ...

    @abstractmethod
    async def seed_defaults_if_empty(self) -> list[AdminResponse]:
        ...

    @abstractmethod
    async def create_admin(self, data: AdminCreate) -> AdminResponse:
        ...
