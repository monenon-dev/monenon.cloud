"""관리자 운영 대시보드 API — /admin/dashboard."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Path

from admin.adapter.inbound.api.schemas.admin_schema import AdminDashboardOverview
from admin.app.composition.providers import get_admin_use_case
from admin.app.ports.input.admin_use_case import AdminUseCasePort

admin_dashboard_router = APIRouter(prefix="/admin/dashboard", tags=["admin"])


@admin_dashboard_router.get("/overview", response_model=AdminDashboardOverview)
async def admin_dashboard_overview(
    use_case: AdminUseCasePort = Depends(get_admin_use_case),
) -> AdminDashboardOverview:
    return await use_case.get_dashboard_overview()


@admin_dashboard_router.post("/risks/{warning_id}/processed", status_code=204)
async def admin_mark_risk_processed(
    warning_id: int = Path(..., ge=1),
    use_case: AdminUseCasePort = Depends(get_admin_use_case),
) -> None:
    try:
        await use_case.mark_risk_processed(warning_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
