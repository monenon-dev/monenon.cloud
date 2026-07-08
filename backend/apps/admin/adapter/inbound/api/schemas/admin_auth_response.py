"""관리자 로그인 응답 스키마."""

from __future__ import annotations

from pydantic import BaseModel


class AdminLoginResponse(BaseModel):
    access_token: str
    email: str
    nickname: str
