"""silicon_valley HTTP API 조립."""

from __future__ import annotations

from fastapi import APIRouter

from silicon_valley.adapter.inbound.api.v1.semantic_router import semantic_router

silicon_valley_api_router = APIRouter(prefix="/api/v1/silicon-valley")
silicon_valley_api_router.include_router(semantic_router)
