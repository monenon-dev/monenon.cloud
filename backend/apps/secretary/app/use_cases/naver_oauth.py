"""네이버 OAuth authorization code → 프로필."""

from __future__ import annotations

import os

import httpx

NAVER_TOKEN_URL = "https://nid.naver.com/oauth2.0/token"
NAVER_PROFILE_URL = "https://openapi.naver.com/v1/nid/me"


def _allowed_redirect_uri(redirect_uri: str) -> bool:
    origin = redirect_uri.rsplit("/api/auth/callback/", 1)[0]
    allowed = os.getenv(
        "OAUTH_REDIRECT_ORIGINS",
        "http://localhost:3000,https://www.monenon.cloud,https://monenon.cloud",
    )
    return any(origin == item.strip() for item in allowed.split(",") if item.strip())


async def fetch_naver_profile(code: str, redirect_uri: str) -> dict[str, str | None]:
    if not _allowed_redirect_uri(redirect_uri):
        raise ValueError("허용되지 않은 redirect_uri 입니다.")

    client_id = os.getenv("NAVER_CLIENT_ID", "").strip()
    client_secret = os.getenv("NAVER_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise RuntimeError("NAVER_CLIENT_ID 또는 NAVER_CLIENT_SECRET이 설정되지 않았습니다.")

    async with httpx.AsyncClient(timeout=15.0) as client:
        token_res = await client.get(
            NAVER_TOKEN_URL,
            params={
                "grant_type": "authorization_code",
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
            },
        )
        try:
            token_data = token_res.json()
        except Exception as exc:
            raise ValueError("네이버 토큰 응답을 해석하지 못했습니다.") from exc
        if not isinstance(token_data, dict):
            raise ValueError("네이버 토큰 응답 형식이 올바르지 않습니다.")

        naver_error = token_data.get("error")
        if token_res.status_code >= 400 or naver_error:
            desc = token_data.get("error_description") or token_data.get("error") or "unknown"
            raise ValueError(f"네이버 토큰 발급 실패: {desc}")

        access_token = token_data.get("access_token")
        if not isinstance(access_token, str) or not access_token:
            raise ValueError("네이버 access_token을 받지 못했습니다.")

        profile_res = await client.get(
            NAVER_PROFILE_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if profile_res.status_code >= 400:
            raise ValueError("네이버 프로필 조회에 실패했습니다.")
        body = profile_res.json()

    response = body.get("response") if isinstance(body, dict) else None
    if not isinstance(response, dict):
        raise ValueError("네이버 프로필 형식이 올바르지 않습니다.")

    email_raw = response.get("email")
    email = email_raw.strip().lower() if isinstance(email_raw, str) and "@" in email_raw else None
    name = response.get("name") or response.get("nickname")
    nickname = name.strip()[:32] if isinstance(name, str) and name.strip() else None
    profile_image = response.get("profile_image")
    profile_image_url = profile_image if isinstance(profile_image, str) and profile_image else None

    if not email:
        raise ValueError("네이버 계정 이메일 권한이 필요합니다. 네이버 개발자 센터에서 이메일 제공 동의를 확인해 주세요.")

    return {
        "email": email,
        "nickname": nickname,
        "profile_image_url": profile_image_url,
    }
