"""관리자 사용자 설정 조회 API — /admin/user-settings."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from admin.adapter.inbound.api.schemas.admin_schema import AdminUserSettingRow
from admin.app.composition.providers import get_admin_use_case
from admin.app.ports.input.admin_use_case import AdminUseCasePort

admin_user_settings_router = APIRouter(prefix="/admin/user-settings", tags=["admin"])


@admin_user_settings_router.get("", response_model=list[AdminUserSettingRow])
async def admin_list_user_settings(
    use_case: AdminUseCasePort = Depends(get_admin_use_case),
) -> list[AdminUserSettingRow]:
    return await use_case.list_member_user_settings()
