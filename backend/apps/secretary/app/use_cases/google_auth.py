"""Google ID 토큰 검증."""

from __future__ import annotations

import os

from google.auth.transport import requests
from google.oauth2 import id_token

# PC 시계가 Google 서버와 몇 초 어긋나도 로그인이 되도록 여유를 둔다.
_CLOCK_SKEW_SECONDS = 60


def verify_google_id_token(token: str) -> dict[str, str | bool]:
    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    if not client_id:
        raise RuntimeError("GOOGLE_CLIENT_ID가 설정되지 않았습니다.")

    try:
        payload = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            client_id,
            clock_skew_in_seconds=_CLOCK_SKEW_SECONDS,
        )
    except ValueError as exc:
        message = str(exc)
        if "too early" in message or "too late" in message or "Expired" in message:
            raise ValueError(
                "시스템 시간이 맞지 않아 Google 로그인을 확인할 수 없습니다. "
                "Windows 설정 → 시간 및 언어 → '시간 자동 설정'을 켠 뒤 다시 시도해 주세요."
            ) from exc
        raise

    if not isinstance(payload, dict):
        raise ValueError("Google 토큰 형식이 올바르지 않습니다.")
    return payload
