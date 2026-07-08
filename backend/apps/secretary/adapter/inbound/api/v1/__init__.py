"""secretary HTTP API v1 — 사용자 라우터 통합."""

from __future__ import annotations

from fastapi import APIRouter

from secretary.adapter.inbound.api.v1.login_router import login_router
from secretary.adapter.inbound.api.v1.profile_router import profile_router
from secretary.adapter.inbound.api.v1.register_router import register_router

secretary_router = APIRouter()

secretary_router.include_router(register_router)
secretary_router.include_router(login_router)
secretary_router.include_router(profile_router)

__all__ = ["secretary_router"]
