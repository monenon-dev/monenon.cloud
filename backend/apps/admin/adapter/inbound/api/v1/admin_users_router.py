"""관리자 회원 관리 API — /admin/users."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Path

from admin.adapter.inbound.api.schemas.admin_schema import (
    AdminResponse,
    AdminUserCreate,
    WarningCreate,
    WarningSendResult,
)
from admin.app.composition.providers import get_admin_use_case
from admin.app.ports.input.admin_use_case import AdminUseCasePort

admin_users_router = APIRouter(prefix="/admin/users", tags=["admin"])


@admin_users_router.get("", response_model=list[AdminResponse])
async def admin_list_users(
    use_case: AdminUseCasePort = Depends(get_admin_use_case),
) -> list[AdminResponse]:
    return await use_case.list_all()


@admin_users_router.get("/members", response_model=list[AdminResponse])
async def admin_list_members(
    use_case: AdminUseCasePort = Depends(get_admin_use_case),
) -> list[AdminResponse]:
    return await use_case.list_members()


@admin_users_router.get("/admins", response_model=list[AdminResponse])
async def admin_list_admins(
    use_case: AdminUseCasePort = Depends(get_admin_use_case),
) -> list[AdminResponse]:
    return await use_case.list_admins()


@admin_users_router.post("", response_model=AdminResponse, status_code=201)
async def admin_create_user(
    body: AdminUserCreate,
    use_case: AdminUseCasePort = Depends(get_admin_use_case),
) -> AdminResponse:
    try:
        return await use_case.create_user(body)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@admin_users_router.delete("/{user_id}", status_code=204)
async def admin_withdraw_member(
    user_id: int = Path(..., ge=1),
    use_case: AdminUseCasePort = Depends(get_admin_use_case),
) -> None:
    try:
        await use_case.withdraw_member(user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@admin_users_router.post("/{user_id}/warnings", response_model=WarningSendResult, status_code=201)
async def admin_send_warning(
    body: WarningCreate,
    user_id: int = Path(..., ge=1),
    use_case: AdminUseCasePort = Depends(get_admin_use_case),
) -> WarningSendResult:
    try:
        return await use_case.send_warning(user_id, body)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@admin_users_router.post("/{user_id}/unsuspend", response_model=AdminResponse)
async def admin_unsuspend_member(
    user_id: int = Path(..., ge=1),
    use_case: AdminUseCasePort = Depends(get_admin_use_case),
) -> AdminResponse:
    try:
        return await use_case.unsuspend_member(user_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
