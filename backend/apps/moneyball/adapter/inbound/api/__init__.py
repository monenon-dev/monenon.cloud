from fastapi import APIRouter

# v1 라우터 구현 후 include
# from moneyball.adapter.inbound.api.v1.beane_gm_scout_router import beane_router
# from moneyball.adapter.inbound.api.v1.brand_analyst_router import brand_router

moneyball_router = APIRouter()
# moneyball_router.include_router(beane_router)
# moneyball_router.include_router(brand_router)
