"""브리핑 validator 모드 조회."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.adapter.outbound.pg.notification_settings_pg_repository import (
    NotificationSettingsPgRepository,
)

ValidatorMode = str  # "auto" | "review"


async def load_briefing_validator_mode(
    session: AsyncSession | None,
    user_id: int | None,
) -> ValidatorMode:
    if session is None or user_id is None:
        return "auto"
    repo = NotificationSettingsPgRepository(session)
    row = await repo.get(user_id)
    mode = (row.briefing_validator_mode or "auto").strip().lower()
    return mode if mode in ("auto", "review") else "auto"
