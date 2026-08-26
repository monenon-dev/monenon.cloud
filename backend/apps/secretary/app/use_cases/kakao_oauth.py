"""카카오 OAuth — 토큰 교환 + 프로필."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

KAKAO_TOKEN_URL = "https://kauth.kakao.com/oauth/token"
KAKAO_PROFILE_URL = "https://kapi.kakao.com/v2/user/me"


def _allowed_redirect_uri(redirect_uri: str) -> bool:
    origin = redirect_uri.rsplit("/api/auth/callback/", 1)[0]
    allowed = os.getenv(
        "OAUTH_REDIRECT_ORIGINS",
        "http://localhost:3000,https://www.monenon.cloud,https://monenon.cloud",
    )
    return any(origin == item.strip() for item in allowed.split(",") if item.strip())


def _client_credentials() -> tuple[str, str]:
    client_id = os.getenv("KAKAO_CLIENT_ID", "").strip()
    client_secret = os.getenv("KAKAO_CLIENT_SECRET", "").strip()
    if not client_id:
        raise RuntimeError("KAKAO_CLIENT_ID가 설정되지 않았습니다.")
    return client_id, client_secret


def _parse_kakao_profile_body(
    body: dict[str, Any],
    *,
    access_token: str,
    refresh_token: str | None = None,
    expires_at: datetime | None = None,
    scope: str | None = None,
) -> dict[str, Any]:
    kakao_account = body.get("kakao_account")
    account = kakao_account if isinstance(kakao_account, dict) else {}
    email_raw = account.get("email")
    email = (
        email_raw.strip().lower()
        if isinstance(email_raw, str) and "@" in email_raw
        else None
    )

    profile = account.get("profile")
    profile_dict = profile if isinstance(profile, dict) else {}
    nickname_raw = profile_dict.get("nickname")
    nickname = (
        nickname_raw.strip()[:32]
        if isinstance(nickname_raw, str) and nickname_raw.strip()
        else None
    )
    image_raw = profile_dict.get("profile_image_url")
    profile_image_url = image_raw if isinstance(image_raw, str) and image_raw else None

    if not email:
        raise ValueError(
            "카카오 계정 이메일 권한이 필요합니다. "
            "카카오 개발자 콘솔에서 이메일 동의 항목을 확인해 주세요."
        )

    return {
        "email": email,
        "nickname": nickname,
        "profile_image_url": profile_image_url,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_at": expires_at,
        "scope": scope,
    }


async def exchange_kakao_code(code: str, redirect_uri: str) -> dict[str, Any]:
    """authorization code → token + 프로필. tokens는 톡캘린더용으로 저장한다."""
    if not _allowed_redirect_uri(redirect_uri):
        raise ValueError("허용되지 않은 redirect_uri 입니다.")

    client_id, client_secret = _client_credentials()
    data = {
        "grant_type": "authorization_code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "code": code,
    }
    if client_secret:
        data["client_secret"] = client_secret

    async with httpx.AsyncClient(timeout=15.0) as client:
        token_res = await client.post(
            KAKAO_TOKEN_URL,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code >= 400:
            raise ValueError("카카오 토큰 발급에 실패했습니다.")
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        if not isinstance(access_token, str) or not access_token:
            raise ValueError("카카오 access_token을 받지 못했습니다.")

        profile_res = await client.get(
            KAKAO_PROFILE_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            params={"property_keys": '["kakao_account.email", "kakao_account.profile"]'},
        )
        if profile_res.status_code >= 400:
            raise ValueError("카카오 프로필 조회에 실패했습니다.")
        body = profile_res.json()

    if not isinstance(body, dict):
        raise ValueError("카카오 프로필 형식이 올바르지 않습니다.")

    expires_in = token_data.get("expires_in")
    expires_at = None
    if isinstance(expires_in, int) and expires_in > 0:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    scope_raw = token_data.get("scope")
    scope = scope_raw if isinstance(scope_raw, str) else None
    refresh = token_data.get("refresh_token")
    refresh_token = refresh if isinstance(refresh, str) else None

    return _parse_kakao_profile_body(
        body,
        access_token=access_token,
        refresh_token=refresh_token,
        expires_at=expires_at,
        scope=scope,
    )


async def fetch_kakao_profile_with_access_token(access_token: str) -> dict[str, Any]:
    """네이티브 SDK가 발급한 카카오 access_token으로 프로필 조회."""
    token = access_token.strip()
    if not token:
        raise ValueError("카카오 access_token이 필요합니다.")

    async with httpx.AsyncClient(timeout=15.0) as client:
        profile_res = await client.get(
            KAKAO_PROFILE_URL,
            headers={"Authorization": f"Bearer {token}"},
            params={"property_keys": '["kakao_account.email", "kakao_account.profile"]'},
        )
        if profile_res.status_code >= 400:
            raise ValueError("카카오 프로필 조회에 실패했습니다.")
        body = profile_res.json()

    if not isinstance(body, dict):
        raise ValueError("카카오 프로필 형식이 올바르지 않습니다.")

    return _parse_kakao_profile_body(body, access_token=token)


async def fetch_kakao_profile(code: str, redirect_uri: str) -> dict[str, str | None]:
    """하위 호환 — 프로필 필드만."""
    full = await exchange_kakao_code(code, redirect_uri)
    return {
        "email": full["email"],
        "nickname": full.get("nickname") if isinstance(full.get("nickname"), str) else None,
        "profile_image_url": (
            full.get("profile_image_url")
            if isinstance(full.get("profile_image_url"), str)
            else None
        ),
    }


async def refresh_kakao_access_token(refresh_token: str) -> dict[str, Any]:
    client_id, client_secret = _client_credentials()
    data = {
        "grant_type": "refresh_token",
        "client_id": client_id,
        "refresh_token": refresh_token,
    }
    if client_secret:
        data["client_secret"] = client_secret

    async with httpx.AsyncClient(timeout=15.0) as client:
        res = await client.post(
            KAKAO_TOKEN_URL,
            data=data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if res.status_code >= 400:
            raise ValueError(
                "카카오 토큰 갱신에 실패했습니다. 톡캘린더 연동을 다시 켜 주세요."
            )
        token_data = res.json()

    access_token = token_data.get("access_token")
    if not isinstance(access_token, str) or not access_token:
        raise ValueError("카카오 access_token을 받지 못했습니다.")

    expires_in = token_data.get("expires_in")
    expires_at = None
    if isinstance(expires_in, int) and expires_in > 0:
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    new_refresh = token_data.get("refresh_token")
    return {
        "access_token": access_token,
        "refresh_token": new_refresh if isinstance(new_refresh, str) else refresh_token,
        "expires_at": expires_at,
        "scope": token_data.get("scope")
        if isinstance(token_data.get("scope"), str)
        else None,
    }
