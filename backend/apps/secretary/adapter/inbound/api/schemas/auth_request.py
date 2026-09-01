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


class KakaoLoginBody(BaseModel):
    """카카오 로그인 — 웹(code) 또는 네이티브 SDK(access_token)."""

    code: str | None = Field(default=None, min_length=4)
    redirect_uri: str | None = Field(default=None, min_length=10)
    access_token: str | None = Field(
        default=None,
        min_length=10,
        description="Flutter kakao_flutter_sdk 등으로 받은 카카오 access token",
    )

    def has_code_flow(self) -> bool:
        return bool(self.code and self.redirect_uri)

    def has_token_flow(self) -> bool:
        return bool(self.access_token and self.access_token.strip())


class RegisterBody(BaseModel):
    """회원가입 본문."""

    nickname: str = Field(..., min_length=1, max_length=32)
    email: str = Field(..., min_length=3)
    password: str = Field(..., min_length=4)
