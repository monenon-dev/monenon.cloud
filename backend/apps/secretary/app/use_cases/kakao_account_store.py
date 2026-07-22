"""카카오 OAuth 토큰 → kakao_accounts upsert."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from secretary.adapter.outbound.orm.kakao_account import KakaoAccount


def _scope_has_calendar(scope: str | None) -> bool:
    if not scope:
        return False
    parts = {p.strip() for p in scope.replace(",", " ").split() if p.strip()}
    return "talk_calendar" in parts


async def upsert_kakao_account(
    session: AsyncSession,
    user_id: int,
    *,
    access_token: str,
    refresh_token: str | None = None,
    expires_at: datetime | None = None,
    scope: str | None = None,
) -> KakaoAccount:
    result = await session.execute(
        select(KakaoAccount).where(KakaoAccount.user_id == user_id)
    )
    row = result.scalar_one_or_none()
    calendar_scope = _scope_has_calendar(scope)

    if row is None:
        row = KakaoAccount(
            user_id=user_id,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
            scope=scope,
            calendar_scope=calendar_scope,
        )
        session.add(row)
    else:
        row.access_token = access_token
        if refresh_token is not None:
            row.refresh_token = refresh_token
        row.expires_at = expires_at
        if scope is not None:
            row.scope = scope
        row.calendar_scope = calendar_scope or row.calendar_scope

    await session.flush()
    return row
