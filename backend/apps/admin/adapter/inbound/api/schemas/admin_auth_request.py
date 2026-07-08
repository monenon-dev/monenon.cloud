"""관리자 로그인 요청 스키마."""

from __future__ import annotations

from pydantic import BaseModel, Field


class AdminLoginBody(BaseModel):
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)
