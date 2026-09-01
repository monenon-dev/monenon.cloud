"""Cloud Scheduler 등 내부 HTTP 트리거 전용 인증."""

from __future__ import annotations

import os

from fastapi import Header, HTTPException

_HEADER_NAME = "X-Internal-Cron-Secret"


async def verify_internal_cron_secret(
    x_internal_cron_secret: str | None = Header(default=None, alias=_HEADER_NAME),
) -> None:
    expected = os.getenv("INTERNAL_CRON_SECRET", "").strip()
    if not expected:
        raise HTTPException(
            status_code=503,
            detail="INTERNAL_CRON_SECRET이 설정되지 않았습니다.",
        )
    if not x_internal_cron_secret or x_internal_cron_secret != expected:
        raise HTTPException(status_code=401, detail="내부 트리거 인증에 실패했습니다.")
