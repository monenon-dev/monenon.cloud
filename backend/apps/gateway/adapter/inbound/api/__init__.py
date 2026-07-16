from fastapi import APIRouter

from gateway.adapter.inbound.api.v1.dispatch_router import dispatch_router
from gateway.adapter.inbound.api.v1.intent_router import gateway_router

gateway_api_router = APIRouter(prefix="/api")
gateway_api_router.include_router(gateway_router)
gateway_api_router.include_router(dispatch_router)
