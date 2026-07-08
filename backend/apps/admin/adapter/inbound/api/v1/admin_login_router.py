"""관리자 로그인 API — /admin/login."""

from __future__ import annotations

import logging
import secrets

from fastapi import APIRouter, HTTPException

from admin.adapter.inbound.api.schemas.admin_auth_request import AdminLoginBody
from admin.adapter.inbound.api.schemas.admin_auth_response import AdminLoginResponse
from admin.app.constants import ADMIN_EMAIL, ADMIN_NICKNAME, ADMIN_PASSWORD

logger = logging.getLogger(__name__)

admin_login_router = APIRouter(prefix="/admin", tags=["admin-auth"])


@admin_login_router.post("/login", response_model=AdminLoginResponse)
async def admin_login(body: AdminLoginBody) -> AdminLoginResponse:
    email = body.email.strip().lower()
    if email != ADMIN_EMAIL or body.password != ADMIN_PASSWORD:
        logger.warning("[AdminAuth] login 실패 — email=%s", email)
        raise HTTPException(
            status_code=401,
            detail="관리자 이메일 또는 비밀번호가 올바르지 않습니다.",
        )
    token = secrets.token_urlsafe(48)
    logger.info("[AdminAuth] login 성공")
    return AdminLoginResponse(access_token=token, email=ADMIN_EMAIL, nickname=ADMIN_NICKNAME)
