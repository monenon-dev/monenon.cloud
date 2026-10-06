"""Gmail OAuth — authorization code 교환·갱신."""

from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

GMAIL_SCOPES = (
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
)
TOKEN_URL = "https://oauth2.googleapis.com/token"


def _allowed_redirect_uri(redirect_uri: str) -> bool:
    origin = redirect_uri.rsplit("/api/auth/callback/", 1)[0]
    allowed = os.getenv(
        "OAUTH_REDIRECT_ORIGINS",
        "http://localhost:3000,https://moneo.choseohee.com",
    )
    return any(origin == item.strip() for item in allowed.split(",") if item.strip())


def _client_credentials() -> tuple[str, str]:
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise RuntimeError(
            "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET가 설정되지 않았습니다. "
            "Gmail 연동 OAuth에 client secret이 필요합니다."
        )
    return client_id, client_secret


async def exchange_gmail_code(code: str, redirect_uri: str) -> dict[str, Any]:
    if not _allowed_redirect_uri(redirect_uri):
        raise ValueError("허용되지 않은 redirect_uri 입니다.")

    client_id, client_secret = _client_credentials()
    async with httpx.AsyncClient(timeout=20.0) as client:
        res = await client.post(
            TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": client_id,
                "client_secret": client_secret,
            },
        )
        if res.status_code >= 400:
            raise ValueError("Gmail OAuth 토큰 교환에 실패했습니다.")
        data = res.json()

    access_token = data.get("access_token")
    if not isinstance(access_token, str) or not access_token:
        raise ValueError("Gmail access_token을 받지 못했습니다.")

    refresh_token = data.get("refresh_token")
    expires_in = data.get("expires_in")
    expires_at = None
    if isinstance(expires_in, (int, float)):
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))

    return {
        "access_token": access_token,
        "refresh_token": refresh_token if isinstance(refresh_token, str) else None,
        "expires_at": expires_at,
        "metadata": {"scope": " ".join(GMAIL_SCOPES)},
    }


async def refresh_gmail_access_token(refresh_token: str) -> dict[str, Any]:
    client_id, client_secret = _client_credentials()
    async with httpx.AsyncClient(timeout=20.0) as client:
        res = await client.post(
            TOKEN_URL,
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": client_id,
                "client_secret": client_secret,
            },
        )
        if res.status_code >= 400:
            raise ValueError("Gmail 토큰 갱신에 실패했습니다.")
        data = res.json()

    access_token = data.get("access_token")
    if not isinstance(access_token, str) or not access_token:
        raise ValueError("Gmail access_token 갱신 결과가 비어 있습니다.")

    expires_in = data.get("expires_in")
    expires_at = None
    if isinstance(expires_in, (int, float)):
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=int(expires_in))

    return {"access_token": access_token, "expires_at": expires_at}
