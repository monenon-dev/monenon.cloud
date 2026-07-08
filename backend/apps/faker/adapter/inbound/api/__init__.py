from fastapi import APIRouter

from faker.adapter.inbound.api.v1 import faker_router

faker_api_router = APIRouter()
faker_api_router.include_router(faker_router)
