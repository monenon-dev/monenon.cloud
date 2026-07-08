"""관리자 연계 사용자 API (/auth/warnings)."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from admin.adapter.inbound.api.schemas.admin_schema import WarningResponse
from admin.app.composition.providers import get_admin_use_case
from admin.app.ports.input.admin_use_case import AdminUseCasePort

admin_auth_router = APIRouter(prefix="/auth", tags=["secom-admin"])


@admin_auth_router.get("/warnings", response_model=list[WarningResponse])
async def auth_warnings(
    user_id: int,
    use_case: AdminUseCasePort = Depends(get_admin_use_case),
) -> list[WarningResponse]:
    """관리자가 보낸 경고 목록."""
    return await use_case.list_warnings_for_user(user_id)
