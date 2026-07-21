"""인증 API 요청 스키마."""

from __future__ import annotations

from pydantic import BaseModel, Field

from secretary.adapter.outbound.orm.user_model import UserRole


class UserCreate(BaseModel):
    nickname: str = Field(..., min_length=1, max_length=32)
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)
    role: UserRole = UserRole.USER


class AuthCredentials(BaseModel):
    """로그인 본문."""

    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=4)


class GoogleLoginBody(BaseModel):
    """Google OAuth ID 토큰."""

    credential: str = Field(..., min_length=10)


class OAuthCodeBody(BaseModel):
    """소셜 OAuth authorization code."""

    code: str = Field(..., min_length=4)
    redirect_uri: str = Field(..., min_length=10)


class RegisterBody(BaseModel):
    """회원가입 본문."""

    nickname: str = Field(..., min_length=1, max_length=32)
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=4)
