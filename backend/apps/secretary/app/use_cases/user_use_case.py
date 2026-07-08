"""일반 사용자 비즈니스 로직 — role=user."""

from __future__ import annotations

import logging
import secrets

from secretary.adapter.inbound.api.schemas.auth_request import UserCreate
from secretary.adapter.inbound.api.schemas.auth_response import UserProfileResponse, UserResponse
from secretary.adapter.outbound.orm.user_model import User, UserRole
from secretary.adapter.outbound.pg.user_command_pg_repository import UserCommandPgRepository
from secretary.adapter.outbound.pg.user_query_pg_repository import UserQueryPgRepository
from secretary.app.ports.input.user_use_case import UserUseCasePort
from secretary.app.use_cases.google_auth import verify_google_id_token
from secretary.app.use_cases.password import hash_password, verify_password
from secretary.app.use_cases.suspension import is_user_suspended, suspension_detail_message

logger = logging.getLogger(__name__)


class UserUseCase(UserUseCasePort):
    def __init__(
        self,
        query_repository: UserQueryPgRepository,
        command_repository: UserCommandPgRepository,
    ) -> None:
        self._query = query_repository
        self._command = command_repository

    @staticmethod
    def to_response(user: User) -> UserResponse:
        return UserResponse(
            id=user.id,
            nickname=user.nickname,
            email=user.email,
            role=user.role,
        )

    async def register(self, nickname: str, email: str, password: str) -> UserResponse:
        data = UserCreate(
            nickname=nickname,
            email=email,
            password=password,
            role=UserRole.USER,
        )
        return await self.save_user(data)

    async def save_user(self, data: UserCreate) -> UserResponse:
        if data.role != UserRole.USER:
            raise ValueError("일반 사용자 API에서는 role=user 만 허용됩니다.")

        email = data.email.strip().lower()
        if email == "admin@gmail.com":
            raise ValueError("이 이메일은 사용할 수 없습니다.")
        if "@" not in email:
            raise ValueError("유효한 이메일 형식이 아닙니다.")
        if await self._query.find_by_email(email):
            raise ValueError("이미 등록된 이메일입니다.")

        user = User(
            email=email,
            nickname=data.nickname.strip(),
            password_hash=hash_password(data.password),
            role=UserRole.USER,
        )
        saved = await self._command.save(user)
        response = self.to_response(saved)
        logger.info("[UserUseCase] save_user 레이어 완료 — userId=%s", response.id)
        return response

    async def _clear_expired_suspension(self, user: User) -> User:
        if user.suspended_until is not None and not is_user_suspended(user):
            user.suspended_until = None
            return await self._command.save(user)
        return user

    async def authenticate(self, email: str, password: str) -> User | None:
        user = await self._query.find_by_email(email.strip().lower())
        if not user or not verify_password(password, user.password_hash):
            return None
        user = await self._clear_expired_suspension(user)
        if is_user_suspended(user):
            raise ValueError(suspension_detail_message(user))
        logger.info("[UserUseCase] authenticate 레이어 완료 — userId=%s", user.id)
        return user

    async def authenticate_with_google(self, credential: str) -> User:
        payload = verify_google_id_token(credential)
        email_raw = payload.get("email")
        if not isinstance(email_raw, str) or "@" not in email_raw:
            raise ValueError("Google 계정 이메일을 확인할 수 없습니다.")

        email = email_raw.strip().lower()
        if email == "admin@gmail.com":
            raise ValueError("이 이메일은 사용할 수 없습니다.")
        if payload.get("email_verified") is False:
            raise ValueError("이메일이 인증되지 않은 Google 계정입니다.")

        existing = await self._query.find_by_email(email)
        if existing:
            existing = await self._clear_expired_suspension(existing)
            if is_user_suspended(existing):
                raise ValueError(suspension_detail_message(existing))
            picture = payload.get("picture")
            if isinstance(picture, str) and picture and not existing.profile_image_url:
                existing.profile_image_url = picture
                await self._command.save(existing)
            logger.info("[UserUseCase] authenticate_with_google 기존 사용자 — userId=%s", existing.id)
            return existing

        name = payload.get("name")
        nickname_source = name if isinstance(name, str) and name.strip() else email.split("@")[0]
        nickname = nickname_source.strip()[:32] or "user"
        picture = payload.get("picture")
        profile_image_url = picture if isinstance(picture, str) and picture else None

        user = User(
            email=email,
            nickname=nickname,
            password_hash=hash_password(secrets.token_urlsafe(32)),
            role=UserRole.USER,
            profile_image_url=profile_image_url,
        )
        saved = await self._command.save(user)
        logger.info("[UserUseCase] authenticate_with_google 신규 사용자 — userId=%s", saved.id)
        return saved

    async def get_profile(self, user_id: int) -> UserProfileResponse | None:
        user = await self._query.find_by_id(user_id)
        if not user:
            return None
        profile = UserProfileResponse(
            id=user.id,
            nickname=user.nickname,
            email=user.email,
            role=user.role,
            created_at=user.created_at,
            profile_image_url=user.profile_image_url,
        )
        logger.info("[UserUseCase] get_profile 완료 — userId=%s", user_id)
        return profile

    async def update_profile_image(self, user_id: int, image_url: str) -> UserProfileResponse | None:
        user = await self._query.find_by_id(user_id)
        if not user:
            return None
        user.profile_image_url = image_url
        await self._command.save(user)
        logger.info("[UserUseCase] update_profile_image 완료 — userId=%s", user_id)
        return await self.get_profile(user_id)
