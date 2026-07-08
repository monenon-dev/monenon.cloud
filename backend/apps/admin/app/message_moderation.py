"""사용자 채팅 메시지 자동 검열 — 금칙어 시 warnings 자동 기록."""

from __future__ import annotations

import logging

from sqlalchemy.ext.asyncio import AsyncSession

from admin.adapter.outbound.pg.admin_pg_repository import AdminPgRepository
from admin.app.profanity_filter import contains_profanity

logger = logging.getLogger(__name__)


async def scan_user_message(session: AsyncSession, user_id: int, content: str) -> None:
    if not contains_profanity(content):
        return

    repo = AdminPgRepository(session)
    admin = await repo.find_system_admin()
    if not admin:
        logger.warning("[MessageModeration] 시스템 관리자 없음 — 자동 경고 생략")
        return

    snippet = content.strip().replace("\n", " ")[:200]
    await repo.add_auto_warning(
        admin.id,
        user_id,
        f"[자동검출] 부적절 표현이 확인되었습니다: {snippet}",
    )
    logger.info("[MessageModeration] 자동 경고 기록 — userId=%s", user_id)
