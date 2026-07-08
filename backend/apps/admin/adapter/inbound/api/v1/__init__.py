"""admin HTTP API v1 — 라우터 통합."""

from __future__ import annotations

from fastapi import APIRouter

from admin.adapter.inbound.api.v1.admin_auth_router import admin_auth_router
from admin.adapter.inbound.api.v1.admin_login_router import admin_login_router
from admin.adapter.inbound.api.v1.admin_dashboard_router import admin_dashboard_router
from admin.adapter.inbound.api.v1.admin_user_settings_router import admin_user_settings_router
from admin.adapter.inbound.api.v1.admin_users_router import admin_users_router

admin_router = APIRouter()

admin_router.include_router(admin_auth_router)
admin_router.include_router(admin_login_router)
admin_router.include_router(admin_dashboard_router)
admin_router.include_router(admin_users_router)
admin_router.include_router(admin_user_settings_router)

__all__ = ["admin_router"]
