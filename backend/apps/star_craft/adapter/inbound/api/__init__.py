from fastapi import APIRouter

from star_craft.adapter.inbound.api.v1 import hub_router
from star_craft.adapter.inbound.api.v1.terran_gemini_router import terran_router

star_craft_router = APIRouter()
star_craft_router.include_router(hub_router)
star_craft_router.include_router(terran_router)
