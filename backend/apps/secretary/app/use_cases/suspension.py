"""계정 일시정지 검사."""

from __future__ import annotations

from datetime import datetime, timezone

from secretary.adapter.outbound.orm.user_model import User

ALLOWED_SUSPEND_DAYS = frozenset({1, 3, 5})


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def is_user_suspended(user: User, *, now: datetime | None = None) -> bool:
    if user.suspended_until is None:
        return False
    current = now or utc_now()
    until = user.suspended_until
    if until.tzinfo is None:
        until = until.replace(tzinfo=timezone.utc)
    return until > current


def suspension_detail_message(user: User) -> str:
    if user.suspended_until is None:
        return "계정이 일시정지되어 있습니다."
    until = user.suspended_until
    if until.tzinfo is None:
        until = until.replace(tzinfo=timezone.utc)
    local_text = until.astimezone().strftime("%Y-%m-%d %H:%M")
    return f"계정이 일시정지되어 있습니다. 해제 예정: {local_text}"
