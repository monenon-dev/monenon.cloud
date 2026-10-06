"""Slack OAuth v2 — Bot Token 교환."""

from __future__ import annotations

import os
from typing import Any

import httpx

SLACK_OAUTH_URL = "https://slack.com/api/oauth.v2.access"

DEFAULT_SCOPES = (
    "channels:history,channels:read,groups:history,groups:read,"
    "im:history,mpim:history,users:read,chat:write,im:write"
)


def _allowed_redirect_uri(redirect_uri: str) -> bool:
    origin = redirect_uri.rsplit("/api/auth/callback/", 1)[0]
    allowed = os.getenv(
        "OAUTH_REDIRECT_ORIGINS",
        "http://localhost:3000,https://www.choseohee.com,https://choseohee.com",
    )
    return any(origin == item.strip() for item in allowed.split(",") if item.strip())


def _client_credentials() -> tuple[str, str]:
    client_id = os.getenv("SLACK_CLIENT_ID", "").strip()
    client_secret = os.getenv("SLACK_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise RuntimeError("SLACK_CLIENT_ID / SLACK_CLIENT_SECRET가 설정되지 않았습니다.")
    return client_id, client_secret


async def exchange_slack_code(code: str, redirect_uri: str) -> dict[str, Any]:
    if not _allowed_redirect_uri(redirect_uri):
        raise ValueError("허용되지 않은 redirect_uri 입니다.")

    client_id, client_secret = _client_credentials()
    async with httpx.AsyncClient(timeout=20.0) as client:
        res = await client.post(
            SLACK_OAUTH_URL,
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
            },
        )
        data = res.json()
        if not isinstance(data, dict) or not data.get("ok"):
            err = data.get("error") if isinstance(data, dict) else "unknown"
            raise ValueError(f"Slack OAuth 실패: {err}")

    access_token = data.get("access_token")
    if not isinstance(access_token, str) or not access_token:
        raise ValueError("Slack bot access_token을 받지 못했습니다.")

    authed_user = data.get("authed_user") if isinstance(data.get("authed_user"), dict) else {}
    slack_user_id = authed_user.get("id") if isinstance(authed_user.get("id"), str) else None

    team = data.get("team") if isinstance(data.get("team"), dict) else {}
    team_id = team.get("id") if isinstance(team.get("id"), str) else None

    channel_ids: list[str] = []
    incoming = data.get("incoming_webhook")
    if isinstance(incoming, dict) and isinstance(incoming.get("channel_id"), str):
        channel_ids.append(incoming["channel_id"])

    return {
        "access_token": access_token,
        "metadata": {
            "slack_user_id": slack_user_id,
            "team_id": team_id,
            "channel_ids": channel_ids,
            "scope": data.get("scope"),
        },
    }
