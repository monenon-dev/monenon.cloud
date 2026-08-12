"""user_integrations DB 어댑터."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.adapter.outbound.orm.user_integration_orm import UserIntegration

logger = logging.getLogger(__name__)

PROVIDERS = frozenset({"slack", "gmail"})


class IntegrationPgRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, user_id: int, provider: str) -> UserIntegration | None:
        if provider not in PROVIDERS:
            return None
        result = await self._session.execute(
            select(UserIntegration).where(
                UserIntegration.user_id == user_id,
                UserIntegration.provider == provider,
            )
        )
        return result.scalar_one_or_none()

    async def list_for_user(self, user_id: int) -> list[UserIntegration]:
        result = await self._session.execute(
            select(UserIntegration)
            .where(UserIntegration.user_id == user_id)
            .order_by(UserIntegration.provider)
        )
        return list(result.scalars().all())

    def _is_connected(self, row: UserIntegration | None) -> bool:
        if row is None:
            return False
        if not row.enabled:
            return False
        token = (row.access_token or "").strip()
        return bool(token)

    async def is_active(self, user_id: int, provider: str) -> bool:
        return self._is_connected(await self.get(user_id, provider))

    async def upsert_tokens(
        self,
        *,
        user_id: int,
        provider: str,
        access_token: str,
        refresh_token: str | None = None,
        expires_at: datetime | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> UserIntegration:
        if provider not in PROVIDERS:
            raise ValueError(f"지원하지 않는 provider: {provider}")

        row = await self.get(user_id, provider)
        now = datetime.now(timezone.utc)
        meta = metadata if isinstance(metadata, dict) else {}

        if row is None:
            row = UserIntegration(
                user_id=user_id,
                provider=provider,
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=expires_at,
                enabled=True,
                metadata_json=meta,
                connected_at=now,
            )
            self._session.add(row)
        else:
            row.access_token = access_token
            if refresh_token is not None:
                row.refresh_token = refresh_token
            row.expires_at = expires_at
            row.enabled = True
            row.connected_at = row.connected_at or now
            if meta:
                merged = dict(row.metadata_json or {})
                merged.update(meta)
                row.metadata_json = merged

        await self._session.flush()
        await self._session.refresh(row)
        logger.info(
            "[IntegrationPgRepository] upsert user_id=%s provider=%s",
            user_id,
            provider,
        )
        return row

    async def set_enabled(
        self,
        user_id: int,
        provider: str,
        *,
        enabled: bool,
    ) -> UserIntegration | None:
        row = await self.get(user_id, provider)
        if row is None:
            if not enabled:
                return None
            row = UserIntegration(
                user_id=user_id,
                provider=provider,
                access_token=None,
                enabled=False,
                metadata_json={},
            )
            self._session.add(row)
        else:
            row.enabled = enabled
        await self._session.flush()
        await self._session.refresh(row)
        return row

    async def disconnect(self, user_id: int, provider: str) -> UserIntegration | None:
        row = await self.get(user_id, provider)
        if row is None:
            return None
        row.access_token = None
        row.refresh_token = None
        row.expires_at = None
        row.enabled = False
        await self._session.flush()
        await self._session.refresh(row)
        logger.info(
            "[IntegrationPgRepository] disconnect user_id=%s provider=%s",
            user_id,
            provider,
        )
        return row

    async def update_tokens(
        self,
        row: UserIntegration,
        *,
        access_token: str,
        expires_at: datetime | None = None,
    ) -> UserIntegration:
        row.access_token = access_token
        if expires_at is not None:
            row.expires_at = expires_at
        await self._session.flush()
        await self._session.refresh(row)
        return row
