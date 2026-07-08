from fastapi import APIRouter

from mail.adapter.inbound.api.v1.allowed_sender_router import allowed_sender_router
from mail.adapter.inbound.api.v1.mail_router import mail_router
from mail.adapter.inbound.api.v1.mail_send_router import mail_send_router

mail_api_router = APIRouter()
mail_api_router.include_router(mail_router)
mail_api_router.include_router(allowed_sender_router)
mail_api_router.include_router(mail_send_router)
