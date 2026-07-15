from fastapi import APIRouter

from moneyball.adapter.inbound.api.v1.chat_router import chat_router
from moneyball.adapter.inbound.api.v1.seed_router import seed_router

moneyball_router = APIRouter(prefix="/api")
moneyball_router.include_router(seed_router)
moneyball_router.include_router(chat_router)
