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
        briefing_hour: int | None = None,
        briefing_minute: int | None = None,
        density_threshold: int | None = None,
        active_hours_start: int | None = None,
        active_hours_end: int | None = None,
    ) -> UserNotificationSettings:
        row = await self.get(user_id)
        if alert_calendar_density is not None:
            row.alert_calendar_density = alert_calendar_density
        if alert_urgent_messages is not None:
            row.alert_urgent_messages = alert_urgent_messages
        if briefing_validator_mode is not None:
            mode = briefing_validator_mode.strip().lower()
            row.briefing_validator_mode = mode if mode in ("auto", "review") else "auto"
        if briefing_hour is not None:
            row.briefing_hour = max(0, min(23, briefing_hour))
        if briefing_minute is not None:
            row.briefing_minute = max(0, min(59, briefing_minute))
        if density_threshold is not None:
            row.density_threshold = density_threshold if density_threshold in (2, 3, 4) else 3
        if active_hours_start is not None:
            row.active_hours_start = max(0, min(23, active_hours_start))
        if active_hours_end is not None:
            row.active_hours_end = max(1, min(24, active_hours_end))
        await self._session.flush()
        await self._session.refresh(row)
        return row

    async def list_user_ids_due_for_briefing(
        self,
        hour: int,
        minute: int,
        *,
        active_ids: list[int],
        default_hour: int,
        default_minute: int,
    ) -> list[int]:
        """지금 시각이 브리핑 시각인 활성 사용자. 설정 행이 없으면 env 기본값을 쓴다."""
        if not active_ids:
            return []
        matched = (
            await self._session.execute(
                select(UserNotificationSettings.user_id).where(
                    UserNotificationSettings.user_id.in_(active_ids),
                    UserNotificationSettings.briefing_hour == hour,
                    UserNotificationSettings.briefing_minute == minute,
                )
            )
        ).scalars().all()
        due = {int(uid) for uid in matched}
        if hour == default_hour and minute == default_minute:
            have_row = (
                await self._session.execute(
                    select(UserNotificationSettings.user_id).where(
                        UserNotificationSettings.user_id.in_(active_ids),
                    )
                )
            ).scalars().all()
            due |= set(active_ids) - {int(uid) for uid in have_row}
        return [uid for uid in active_ids if uid in due]
