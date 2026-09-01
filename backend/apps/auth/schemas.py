"""auth API Pydantic 스키마."""

from __future__ import annotations

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=4, max_length=128)


class RefreshRequest(BaseModel):
    refresh_token: str | None = Field(
        default=None,
        description="바디 생략 시 refresh 쿠키 사용",
    )


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    roles: list[str]


class LogoutRequest(BaseModel):
    refresh_token: str | None = None
