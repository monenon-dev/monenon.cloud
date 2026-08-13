"""user_notification_settings DB 어댑터."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.adapter.outbound.orm.user_notification_settings_orm import (
    UserNotificationSettings,
)


class NotificationSettingsPgRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, user_id: int) -> UserNotificationSettings:
        row = await self._session.get(UserNotificationSettings, user_id)
        if row is None:
            row = UserNotificationSettings(user_id=user_id)
            self._session.add(row)
            await self._session.flush()
            await self._session.refresh(row)
        return row

    async def update(
        self,
        user_id: int,
        *,
        alert_calendar_density: bool | None = None,
        alert_urgent_messages: bool | None = None,
        briefing_validator_mode: str | None = None,
    ) -> UserNotificationSettings:
        row = await self.get(user_id)
        if alert_calendar_density is not None:
            row.alert_calendar_density = alert_calendar_density
        if alert_urgent_messages is not None:
            row.alert_urgent_messages = alert_urgent_messages
        if briefing_validator_mode is not None:
            mode = briefing_validator_mode.strip().lower()
            row.briefing_validator_mode = mode if mode in ("auto", "review") else "auto"
        await self._session.flush()
        await self._session.refresh(row)
        return row
