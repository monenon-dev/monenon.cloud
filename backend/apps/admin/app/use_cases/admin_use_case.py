"""관리자 비즈니스 로직."""

from __future__ import annotations

import logging

from admin.adapter.inbound.api.schemas.admin_schema import (
    AdminCreate,
    AdminDashboardOverview,
    AdminResponse,
    AdminUserCreate,
    AdminUserSettingRow,
    ApiCallDailyStat,
    ModelUsageStat,
    RiskyAccountAlert,
    WarningCreate,
    WarningResponse,
    WarningSendResult,
)
from admin.adapter.outbound.orm.admin_account import AdminAccount
from secretary.adapter.outbound.orm.user_model import User, UserRole
from admin.adapter.outbound.pg.admin_pg_repository import AdminPgRepository
from admin.app.constants import (
    ADMIN_EMAIL,
    ADMIN_NICKNAME,
    ADMIN_PASSWORD,
    LEGACY_SEED_EMAILS,
)
from admin.app.ports.input.admin_use_case import AdminUseCasePort
from secretary.app.use_cases.password import hash_password
from secretary.app.use_cases.suspension import ALLOWED_SUSPEND_DAYS, is_user_suspended

logger = logging.getLogger(__name__)


class AdminUseCase(AdminUseCasePort):
    def __init__(self, repository: AdminPgRepository) -> None:
        self._repo = repository

    def to_user_response(self, user: User, *, warning_count: int = 0) -> AdminResponse:
        return AdminResponse(
            id=user.id,
            nickname=user.nickname,
            email=user.email,
            role=user.role,
            warning_count=warning_count,
            is_suspended=is_user_suspended(user),
            suspended_until=user.suspended_until,
        )

    def to_admin_response(self, admin: AdminAccount) -> AdminResponse:
        return AdminResponse(
            id=admin.id,
            nickname=admin.nickname,
            email=admin.email,
            role=UserRole.ADMIN,
            warning_count=0,
            is_suspended=False,
            suspended_until=None,
        )

    async def _users_with_warning_counts(self, users: list[User]) -> list[AdminResponse]:
        counts = await self._repo.count_warnings_for_users([user.id for user in users])
        return [
            self.to_user_response(user, warning_count=counts.get(user.id, 0)) for user in users
        ]

    async def create_admin(self, data: AdminCreate) -> AdminResponse:
        raise ValueError("관리자 계정은 시스템에서 하나만 관리됩니다.")

    async def create_user(self, data: AdminUserCreate) -> AdminResponse:
        if data.role != UserRole.USER:
            raise ValueError("일반 사용자만 생성할 수 있습니다.")
        return await self.save_account(data)

    async def save_account(self, data: AdminUserCreate) -> AdminResponse:
        email = data.email.strip().lower()
        if email == ADMIN_EMAIL.lower():
            raise ValueError("관리자 이메일은 회원가입·생성 API로 등록할 수 없습니다.")
        if "@" not in email:
            raise ValueError("유효한 이메일 형식이 아닙니다.")
        if data.role == UserRole.ADMIN:
            raise ValueError("관리자 계정은 시스템에서 하나만 관리됩니다.")
        if await self._repo.find_user_by_email(email):
            raise ValueError("이미 등록된 이메일입니다.")
        if await self._repo.find_system_admin_by_email(email):
            raise ValueError("이미 등록된 이메일입니다.")

        user = User(
            email=email,
            nickname=data.nickname.strip(),
            password_hash=hash_password(data.password),
            role=UserRole.USER,
        )
        saved = await self._repo.save_user(user)
        response = self.to_user_response(saved)
        logger.info("[AdminUseCase] save_account 레이어 완료 — userId=%s", response.id)
        return response

    async def get_by_id(self, user_id: int) -> AdminResponse | None:
        admin = await self._repo.find_system_admin()
        if admin and admin.id == user_id:
            return self.to_admin_response(admin)
        user = await self._repo.find_user_by_id(user_id)
        return self.to_user_response(user) if user else None

    async def list_all(self) -> list[AdminResponse]:
        admin = await self._repo.find_system_admin()
        users = await self._repo.list_users()
        rows: list[AdminResponse] = []
        if admin:
            rows.append(self.to_admin_response(admin))
        rows.extend(await self._users_with_warning_counts(users))
        return rows

    async def list_admins(self) -> list[AdminResponse]:
        admin = await self._repo.find_system_admin()
        return [self.to_admin_response(admin)] if admin else []

    async def list_members(self) -> list[AdminResponse]:
        users = await self._repo.list_users()
        return await self._users_with_warning_counts(users)

    async def list_member_user_settings(self) -> list[AdminUserSettingRow]:
        rows = await self._repo.list_member_user_settings()
        return [
            AdminUserSettingRow(
                user_id=user.id,
                nickname=user.nickname,
                email=user.email,
                has_settings=setting is not None,
                language=setting.language if setting else None,
                preferred_model=setting.preferred_model if setting else None,
                updated_at=setting.updated_at if setting else None,
            )
            for user, setting in rows
        ]

    async def get_dashboard_overview(self) -> AdminDashboardOverview:
        model_rows = await self._repo.get_preferred_model_stats()
        total_calls, daily_rows = await self._repo.get_assistant_message_stats(days=14)
        risky_rows = await self._repo.list_unprocessed_auto_warnings()
        risky_accounts = [
            RiskyAccountAlert(
                warning_id=warning.id,
                user_id=user.id,
                nickname=user.nickname,
                email=user.email,
                message=warning.message,
                created_at=warning.created_at,
            )
            for warning, user in risky_rows
        ]
        return AdminDashboardOverview(
            model_usage=[ModelUsageStat(model=model, count=count) for model, count in model_rows],
            api_calls_daily=[ApiCallDailyStat(date=day, count=count) for day, count in daily_rows],
            total_api_calls=total_calls,
            risky_accounts=risky_accounts,
            unprocessed_risk_count=len(risky_accounts),
        )

    async def mark_risk_processed(self, warning_id: int) -> None:
        warning = await self._repo.mark_warning_processed(warning_id)
        if not warning:
            raise ValueError("경고를 찾을 수 없습니다.")
        if warning.source != "auto":
            raise ValueError("자동 검출 경고만 처리 완료할 수 있습니다.")

    async def _require_member_user(self, user_id: int) -> User:
        user = await self._repo.find_user_by_id(user_id)
        if not user:
            raise ValueError("사용자를 찾을 수 없습니다.")
        if user.email.lower() == ADMIN_EMAIL.lower():
            raise ValueError("시스템 관리자 계정에는 적용할 수 없습니다.")
        if user.role != UserRole.USER:
            raise ValueError("일반 사용자만 처리할 수 있습니다.")
        return user

    async def withdraw_member(self, user_id: int) -> None:
        user = await self._require_member_user(user_id)
        await self._repo.delete_user(user)
        logger.info("[AdminUseCase] withdraw_member — userId=%s email=%s", user.id, user.email)

    async def send_warning(self, user_id: int, data: WarningCreate) -> WarningSendResult:
        user = await self._require_member_user(user_id)
        admin = await self._repo.find_system_admin()
        if not admin:
            raise ValueError("시스템 관리자 계정이 없습니다.")
        message = data.message.strip()
        if not message:
            raise ValueError("경고 메시지를 입력해 주세요.")
        if data.suspend_days is not None and data.suspend_days not in ALLOWED_SUSPEND_DAYS:
            raise ValueError("일시정지 기간은 1일, 3일, 5일 중에서 선택해 주세요.")

        warning = await self._repo.add_warning(admin.id, user_id, message)
        counts = await self._repo.count_warnings_for_users([user_id])
        warning_count = counts.get(user_id, 0)

        suspended = False
        if warning_count >= 3:
            days = data.suspend_days if data.suspend_days in ALLOWED_SUSPEND_DAYS else 1
            user = await self._repo.suspend_user(user, days=days)
            suspended = True
            logger.info(
                "[AdminUseCase] send_warning — userId=%s warningCount=%s suspendedDays=%s",
                user_id,
                warning_count,
                days,
            )

        return WarningSendResult(
            warning=WarningResponse(
                id=warning.id,
                admin_id=warning.admin_id,
                user_id=warning.user_id,
                message=warning.message,
                created_at=warning.created_at,
            ),
            warning_count=warning_count,
            suspended=suspended,
            suspended_until=user.suspended_until if suspended else None,
        )

    async def unsuspend_member(self, user_id: int) -> AdminResponse:
        user = await self._require_member_user(user_id)
        if not is_user_suspended(user) and user.suspended_until is None:
            raise ValueError("일시정지된 계정이 아닙니다.")
        saved = await self._repo.unsuspend_user(user)
        counts = await self._repo.count_warnings_for_users([user_id])
        logger.info("[AdminUseCase] unsuspend_member — userId=%s", user_id)
        return self.to_user_response(saved, warning_count=counts.get(user_id, 0))

    async def list_warnings_for_user(self, user_id: int) -> list[WarningResponse]:
        user = await self._repo.find_user_by_id(user_id)
        if not user:
            return []
        rows = await self._repo.list_warnings_for_user(user_id)
        return [
            WarningResponse(
                id=w.id,
                admin_id=w.admin_id,
                user_id=w.user_id,
                message=w.message,
                created_at=w.created_at,
            )
            for w in rows
        ]

    async def _cleanup_users_table(self) -> None:
        """users에서 관리자·레거시 시드 계정을 제거한다."""
        for legacy in await self._repo.list_users_by_role(UserRole.ADMIN):
            await self._repo.delete_user(legacy)
            logger.info(
                "[AdminUseCase] users 테이블 legacy admin 삭제 — userId=%s email=%s",
                legacy.id,
                legacy.email,
            )

        for email in LEGACY_SEED_EMAILS:
            row = await self._repo.find_user_by_email(email)
            if row:
                await self._repo.delete_user(row)
                logger.info("[AdminUseCase] legacy seed 삭제 — email=%s", email)

        admin_in_users = await self._repo.find_user_by_email(ADMIN_EMAIL.lower())
        if admin_in_users:
            await self._repo.delete_user(admin_in_users)
            logger.info("[AdminUseCase] users 테이블 admin@gmail.com 삭제 — admins로 이전")

    async def ensure_admin_account(self) -> None:
        """admins 테이블에 고정 관리자 1명(id=1)을 보장한다."""
        await self._cleanup_users_table()

        email = ADMIN_EMAIL.lower()
        password_hash = hash_password(ADMIN_PASSWORD)
        existing = await self._repo.find_system_admin_by_email(email)

        if existing:
            changed = False
            if existing.nickname != ADMIN_NICKNAME:
                existing.nickname = ADMIN_NICKNAME
                changed = True
            existing.password_hash = password_hash
            if existing.id != 1:
                logger.warning(
                    "[AdminUseCase] admins.id=%s (기대값 1). DB를 초기화하거나 admins 행을 정리하세요.",
                    existing.id,
                )
            if changed:
                logger.info("[AdminUseCase] ensure_admin_account — admin@gmail.com 갱신")
            await self._repo.save_system_admin(existing)
            return

        admin = AdminAccount(
            email=email,
            nickname=ADMIN_NICKNAME,
            password_hash=password_hash,
        )
        saved = await self._repo.save_system_admin(admin)
        logger.info(
            "[AdminUseCase] ensure_admin_account — admin@gmail.com 생성 adminId=%s",
            saved.id,
        )

    async def seed_defaults_if_empty(self) -> list[AdminResponse]:
        await self.ensure_admin_account()
        return []
