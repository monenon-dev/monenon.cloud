"""관리자 DB 어댑터 — admins 테이블 + users 목록."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.types import Date

from admin.adapter.outbound.orm.admin_account import AdminAccount
from admin.adapter.outbound.orm.warning import Warning
from orchestration.adapter.outbound.orm.chat_orm import Message, MessageRole
from orchestration.adapter.outbound.orm.orchestration_orm import UserSetting
from secretary.adapter.outbound.orm.user_model import User, UserRole
from secretary.adapter.outbound.pg.user_command_pg_repository import UserCommandPgRepository
from secretary.adapter.outbound.pg.user_query_pg_repository import UserQueryPgRepository
from secretary.app.use_cases.suspension import utc_now

logger = logging.getLogger(__name__)


class AdminPgRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._user_query = UserQueryPgRepository(session)
        self._user_command = UserCommandPgRepository(session)

    async def count_users(self) -> int:
        return await self._user_query.count()

    async def find_user_by_id(self, user_id: int) -> User | None:
        return await self._user_query.find_by_id(user_id)

    async def find_user_by_email(self, email: str) -> User | None:
        return await self._user_query.find_by_email(email)

    async def list_users(self) -> list[User]:
        return await self._user_query.list_all()

    async def list_users_by_role(self, role: UserRole) -> list[User]:
        result = await self._session.execute(
            select(User).where(User.role == role).order_by(User.id)
        )
        return list(result.scalars().all())

    async def save_user(self, user: User) -> User:
        saved = await self._user_command.save(user)
        logger.info(
            "[AdminPgRepository] save_user 레이어 완료 — userId=%s, role=%s",
            saved.id,
            saved.role.value,
        )
        return saved

    async def delete_user(self, user: User) -> None:
        await self._session.delete(user)
        await self._session.flush()
        logger.info("[AdminPgRepository] delete_user — userId=%s email=%s", user.id, user.email)

    async def find_system_admin(self) -> AdminAccount | None:
        result = await self._session.execute(select(AdminAccount).order_by(AdminAccount.id))
        return result.scalars().first()

    async def find_system_admin_by_email(self, email: str) -> AdminAccount | None:
        result = await self._session.execute(
            select(AdminAccount).where(AdminAccount.email == email)
        )
        return result.scalar_one_or_none()

    async def save_system_admin(self, admin: AdminAccount) -> AdminAccount:
        self._session.add(admin)
        await self._session.flush()
        await self._session.refresh(admin)
        logger.info("[AdminPgRepository] save_system_admin — adminId=%s", admin.id)
        return admin

    async def add_warning(self, admin_id: int, user_id: int, message: str) -> Warning:
        warning = Warning(admin_id=admin_id, user_id=user_id, message=message, source="manual")
        self._session.add(warning)
        await self._session.flush()
        await self._session.refresh(warning)
        logger.info(
            "[AdminPgRepository] add_warning — adminId=%s userId=%s warningId=%s",
            admin_id,
            user_id,
            warning.id,
        )
        return warning

    async def add_auto_warning(self, admin_id: int, user_id: int, message: str) -> Warning:
        warning = Warning(admin_id=admin_id, user_id=user_id, message=message, source="auto")
        self._session.add(warning)
        await self._session.flush()
        await self._session.refresh(warning)
        logger.info(
            "[AdminPgRepository] add_auto_warning — adminId=%s userId=%s warningId=%s",
            admin_id,
            user_id,
            warning.id,
        )
        return warning

    async def list_warnings_for_user(self, user_id: int) -> list[Warning]:
        result = await self._session.execute(
            select(Warning)
            .where(Warning.user_id == user_id)
            .order_by(Warning.id.desc())
        )
        return list(result.scalars().all())

    async def count_warnings_for_users(self, user_ids: list[int]) -> dict[int, int]:
        if not user_ids:
            return {}
        result = await self._session.execute(
            select(Warning.user_id, func.count())
            .where(Warning.user_id.in_(user_ids))
            .group_by(Warning.user_id)
        )
        return {int(user_id): int(count) for user_id, count in result.all()}

    async def list_member_user_settings(self) -> list[tuple[User, UserSetting | None]]:
        result = await self._session.execute(
            select(User, UserSetting)
            .outerjoin(UserSetting, User.id == UserSetting.user_id)
            .where(User.role == UserRole.USER)
            .order_by(User.id)
        )
        return list(result.all())

    async def get_preferred_model_stats(self) -> list[tuple[str, int]]:
        result = await self._session.execute(
            select(UserSetting.preferred_model, func.count())
            .group_by(UserSetting.preferred_model)
            .order_by(func.count().desc())
        )
        rows = [(str(model), int(count)) for model, count in result.all()]

        member_count = await self._session.execute(
            select(func.count()).select_from(User).where(User.role == UserRole.USER)
        )
        configured = await self._session.execute(select(func.count()).select_from(UserSetting))
        unconfigured = int(member_count.scalar_one()) - int(configured.scalar_one())
        if unconfigured > 0:
            rows.append(("미설정", unconfigured))
        return rows

    async def get_assistant_message_stats(self, *, days: int = 14) -> tuple[int, list[tuple[str, int]]]:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        total_result = await self._session.execute(
            select(func.count())
            .select_from(Message)
            .where(Message.role == MessageRole.ASSISTANT, Message.created_at >= cutoff)
        )
        total = int(total_result.scalar_one())

        daily_result = await self._session.execute(
            select(cast(Message.created_at, Date), func.count())
            .where(Message.role == MessageRole.ASSISTANT, Message.created_at >= cutoff)
            .group_by(cast(Message.created_at, Date))
            .order_by(cast(Message.created_at, Date))
        )
        daily = [(day.isoformat(), int(count)) for day, count in daily_result.all()]
        return total, daily

    async def list_unprocessed_auto_warnings(self) -> list[tuple[Warning, User]]:
        result = await self._session.execute(
            select(Warning, User)
            .join(User, Warning.user_id == User.id)
            .where(Warning.source == "auto", Warning.processed_at.is_(None))
            .order_by(Warning.id.desc())
        )
        return list(result.all())

    async def suspend_user(self, user: User, *, days: int) -> User:
        user.suspended_until = utc_now() + timedelta(days=days)
        saved = await self._user_command.save(user)
        logger.info(
            "[AdminPgRepository] suspend_user — userId=%s until=%s days=%s",
            saved.id,
            saved.suspended_until,
            days,
        )
        return saved

    async def unsuspend_user(self, user: User) -> User:
        user.suspended_until = None
        saved = await self._user_command.save(user)
        logger.info("[AdminPgRepository] unsuspend_user — userId=%s", saved.id)
        return saved

    async def mark_warning_processed(self, warning_id: int) -> Warning | None:
        result = await self._session.execute(select(Warning).where(Warning.id == warning_id))
        warning = result.scalar_one_or_none()
        if not warning:
            return None
        warning.processed_at = datetime.now(timezone.utc)
        await self._session.flush()
        await self._session.refresh(warning)
        return warning
