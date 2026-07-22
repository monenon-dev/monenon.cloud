"""라이프스타일 설정 API."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.adapter.outbound.orm.registry import CHAT_MODEL_MAP, CHAT_TABLE_META, ORCHESTRATION_MODEL_MAP, ORCHESTRATION_TABLE_META
from orchestration.adapter.outbound.orm.chat_orm import ChatSession, Message, MessageRole
from core.matrix.grid_oracle_database_manager import get_db
from orchestration.app.composition.providers import get_orchestration_pg_repository
from orchestration.adapter.outbound.pg.orchestration_pg_repository import OrchestrationPgRepository
from orchestration.adapter.inbound.api.schemas.settings_schema import PatchUserSettingsBody, UserSettingOut
from admin.adapter.outbound.orm.registry import ADMIN_MODEL_MAP, ADMIN_TABLE_META
from secretary.adapter.outbound.orm.user_model import User

logger = logging.getLogger(__name__)

settings_router = APIRouter(prefix="/platform", tags=["orchestration"])


class TableCount(BaseModel):
    key: str
    label: str
    table_name: str
    count: int
    category: str
    description: str


class PlatformOverview(BaseModel):
    tables: list[TableCount]
    total_records: int


MEMBER_TABLE_META: list[tuple[str, str, str, str, str]] = [
    ("users", "회원", "users", "회원·운영", "마이페이지(개인) · 회원 관리(운영)"),
]

TABLE_META: list[tuple[str, str, str, str, str]] = [
    *ADMIN_TABLE_META,
    *MEMBER_TABLE_META,
    *ORCHESTRATION_TABLE_META,
    *CHAT_TABLE_META,
]

MODEL_MAP = {
    **ADMIN_MODEL_MAP,
    "users": User,
    **ORCHESTRATION_MODEL_MAP,
    **CHAT_MODEL_MAP,
}


@settings_router.get("/user-settings", response_model=UserSettingOut)
async def get_user_settings(
    user_id: int,
    repo: OrchestrationPgRepository = Depends(get_orchestration_pg_repository),
) -> UserSettingOut:
    row = await repo.get_or_create_user_setting(user_id)
    return UserSettingOut(
        id=row.id,
        user_id=row.user_id,
        language=row.language,
        preferred_model=row.preferred_model,
        kakao_calendar_sync=bool(getattr(row, "kakao_calendar_sync", False)),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@settings_router.patch("/user-settings", response_model=UserSettingOut)
async def patch_user_settings(
    body: PatchUserSettingsBody,
    session: AsyncSession = Depends(get_db),
    repo: OrchestrationPgRepository = Depends(get_orchestration_pg_repository),
) -> UserSettingOut:
    row = await repo.get_or_create_user_setting(body.user_id)

    if body.language is not None:
        row.language = body.language.strip() or "ko"
    if body.preferred_model is not None:
        row.preferred_model = body.preferred_model.strip() or row.preferred_model
    if body.kakao_calendar_sync is not None:
        row.kakao_calendar_sync = body.kakao_calendar_sync

    row.updated_at = datetime.now(timezone.utc)
    await session.flush()
    await session.refresh(row)
    logger.info("[OrchestrationController] user_settings 저장 — user_id=%s", body.user_id)
    return UserSettingOut(
        id=row.id,
        user_id=row.user_id,
        language=row.language,
        preferred_model=row.preferred_model,
        kakao_calendar_sync=bool(row.kakao_calendar_sync),
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@settings_router.get("/overview", response_model=PlatformOverview)
async def platform_overview(session: AsyncSession = Depends(get_db)) -> PlatformOverview:
    tables: list[TableCount] = []
    total = 0
    for key, label, table_name, category, description in TABLE_META:
        model = MODEL_MAP[key]
        result = await session.execute(select(func.count()).select_from(model))
        count = int(result.scalar_one())
        total += count
        tables.append(
            TableCount(
                key=key,
                label=label,
                table_name=table_name,
                count=count,
                category=category,
                description=description,
            )
        )
    logger.info("[OrchestrationController] overview — total_records=%s", total)
    return PlatformOverview(tables=tables, total_records=total)


@settings_router.post("/seed-demo")
async def seed_demo_data(
    session: AsyncSession = Depends(get_db),
    repo: OrchestrationPgRepository = Depends(get_orchestration_pg_repository),
) -> dict:
    user_result = await session.execute(select(User).limit(1))
    user = user_result.scalar_one_or_none()
    if not user:
        return {"ok": False, "detail": "users 테이블에 사용자가 없습니다. 먼저 회원가입하세요."}

    await repo.get_or_create_user_setting(user.id)

    session_count = await session.execute(
        select(func.count()).select_from(ChatSession).where(ChatSession.user_id == user.id)
    )
    if int(session_count.scalar_one()) == 0:
        chat = ChatSession(user_id=user.id, title="Monenon 데모 채팅")
        session.add(chat)
        await session.flush()
        session.add_all(
            [
                Message(
                    session_id=chat.id,
                    role=MessageRole.USER,
                    content="오늘 날씨 알려줘",
                ),
                Message(
                    session_id=chat.id,
                    role=MessageRole.ASSISTANT,
                    content="서울의 현재 날씨를 조회했습니다.",
                ),
            ]
        )

    logger.info("[OrchestrationController] seed_demo 완료 — userId=%s", user.id)
    return {"ok": True, "user_id": user.id}
