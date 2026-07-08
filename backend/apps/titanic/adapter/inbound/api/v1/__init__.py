"""Titanic HTTP API v1 — 라우터 통합."""

from __future__ import annotations

from fastapi import APIRouter

from titanic.fractal.catalog import ALL_ROUTERS

titanic_router = APIRouter(prefix="/api")

for _router in ALL_ROUTERS:
    titanic_router.include_router(_router)

__all__ = ["titanic_router"]
