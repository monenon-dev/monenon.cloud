from fastapi import APIRouter

from star_craft.adapter.inbound.api.v1 import hub_router
from star_craft.adapter.inbound.api.v1.terran_gemini_router import terran_router
from star_craft.zerg.web.adapter.inbound.api.v1.zerg_web_router import zerg_web_router

star_craft_router = APIRouter()
star_craft_router.include_router(hub_router)
star_craft_router.include_router(terran_router)
star_craft_router.include_router(zerg_web_router)
