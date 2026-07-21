"""카카오 OAuth authorization code → 프로필."""

from __future__ import annotations

import os

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


async def fetch_kakao_profile(code: str, redirect_uri: str) -> dict[str, str | None]:
    if not _allowed_redirect_uri(redirect_uri):
        raise ValueError("허용되지 않은 redirect_uri 입니다.")

    client_id = os.getenv("KAKAO_CLIENT_ID", "").strip()
    client_secret = os.getenv("KAKAO_CLIENT_SECRET", "").strip()
    if not client_id:
        raise RuntimeError("KAKAO_CLIENT_ID가 설정되지 않았습니다.")

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

    kakao_account = body.get("kakao_account")
    account = kakao_account if isinstance(kakao_account, dict) else {}
    email_raw = account.get("email")
    email = email_raw.strip().lower() if isinstance(email_raw, str) and "@" in email_raw else None

    profile = account.get("profile")
    profile_dict = profile if isinstance(profile, dict) else {}
    nickname_raw = profile_dict.get("nickname")
    nickname = nickname_raw.strip()[:32] if isinstance(nickname_raw, str) and nickname_raw.strip() else None
    image_raw = profile_dict.get("profile_image_url")
    profile_image_url = image_raw if isinstance(image_raw, str) and image_raw else None

    if not email:
        raise ValueError("카카오 계정 이메일 권한이 필요합니다. 카카오 개발자 콘솔에서 이메일 동의 항목을 확인해 주세요.")

    return {
        "email": email,
        "nickname": nickname,
        "profile_image_url": profile_image_url,
    }
