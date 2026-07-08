"""인증 API 응답 스키마."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from secretary.adapter.outbound.orm.user_model import UserRole


class UserResponse(BaseModel):
    id: int
    nickname: str
    email: str
    role: UserRole

    model_config = {"from_attributes": True}


class UserProfileResponse(BaseModel):
    id: int
    nickname: str
    email: str
    role: UserRole
    created_at: datetime | None = None
    profile_image_url: str | None = None

    model_config = {"from_attributes": True}


class RegisterSuccessResponse(BaseModel):
    message: str
    nickname: str
    email: str


class LoginSuccessResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    nickname: str
    role: str
