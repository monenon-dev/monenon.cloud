from __future__ import annotations

from abc import ABC, abstractmethod

from secretary.adapter.inbound.api.schemas.auth_response import UserProfileResponse, UserResponse
from secretary.adapter.outbound.orm.user_model import User


class UserUseCasePort(ABC):
    @abstractmethod
    async def register(self, nickname: str, email: str, password: str) -> UserResponse:
        ...

    @abstractmethod
    async def authenticate(self, email: str, password: str) -> User | None:
        ...

    @abstractmethod
    async def authenticate_with_google(self, credential: str) -> User:
        ...

    @abstractmethod
    async def authenticate_with_naver(self, code: str, redirect_uri: str) -> User:
        ...

    @abstractmethod
    async def authenticate_with_kakao(self, code: str, redirect_uri: str) -> User:
        ...

    @abstractmethod
    async def authenticate_with_kakao_access_token(self, access_token: str) -> User:
        ...

    @abstractmethod
    async def get_profile(self, user_id: int) -> UserProfileResponse | None:
        ...

    @abstractmethod
    async def update_profile_image(self, user_id: int, image_url: str) -> UserProfileResponse | None:
        ...
