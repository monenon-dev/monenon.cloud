"""관리자 API 스키마."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from secretary.adapter.inbound.api.schemas.auth_response import UserResponse
from secretary.adapter.outbound.orm.user_model import UserRole


class AdminCreate(BaseModel):
    nickname: str = Field(..., min_length=1, max_length=32)
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)


class AdminUserCreate(BaseModel):
    """관리자가 일반 사용자 계정 생성."""

    nickname: str = Field(..., min_length=1, max_length=32)
    email: str = Field(..., min_length=3, max_length=255)
    password: str = Field(..., min_length=1, max_length=128)
    role: UserRole = UserRole.USER


class AdminResponse(UserResponse):
    """관리자·사용자 목록 응답 (동일 필드)."""

    warning_count: int = 0
    is_suspended: bool = False
    suspended_until: datetime | None = None


class WarningCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    suspend_days: int | None = Field(
        None,
        description="누적 경고 3회 도달 시 적용할 일시정지 일수 (1, 3, 5)",
    )


class WarningResponse(BaseModel):
    id: int
    admin_id: int
    user_id: int
    message: str
    created_at: datetime | None = None


class WarningSendResult(BaseModel):
    warning: WarningResponse
    warning_count: int
    suspended: bool = False
    suspended_until: datetime | None = None


class SuspendCreate(BaseModel):
    days: int = Field(..., description="일시정지 일수 (1, 3, 5)")


class AdminUserSettingRow(BaseModel):
    """관리자 — 회원별 user_settings 조회 행."""

    user_id: int
    nickname: str
    email: str
    has_settings: bool
    language: str | None = None
    preferred_model: str | None = None
    updated_at: datetime | None = None


class ModelUsageStat(BaseModel):
    model: str
    count: int


class ApiCallDailyStat(BaseModel):
    date: str
    count: int


class RiskyAccountAlert(BaseModel):
    warning_id: int
    user_id: int
    nickname: str
    email: str
    message: str
    created_at: datetime | None = None


class AdminDashboardOverview(BaseModel):
    model_usage: list[ModelUsageStat]
    api_calls_daily: list[ApiCallDailyStat]
    total_api_calls: int
    risky_accounts: list[RiskyAccountAlert]
    unprocessed_risk_count: int
