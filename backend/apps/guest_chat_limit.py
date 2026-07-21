"""게스트 채팅 일일 IP 한도 (단일 프로세스 인메모리)."""

from __future__ import annotations

import threading
from collections import defaultdict
from datetime import date

GUEST_DAILY_LIMIT = 20

_lock = threading.Lock()
_counts: dict[str, dict[str, int]] = defaultdict(dict)


def _today() -> str:
    return date.today().isoformat()


def check_guest_quota(client_ip: str) -> tuple[bool, int, int]:
    """(허용 여부, 오늘 사용 횟수, 한도) — 호출 전 검사."""
    ip = client_ip or "unknown"
    with _lock:
        day = _today()
        used = _counts.get(day, {}).get(ip, 0)
        return used < GUEST_DAILY_LIMIT, used, GUEST_DAILY_LIMIT


def increment_guest_quota(client_ip: str) -> tuple[int, int, int]:
    """성공 응답 후 호출. (사용 횟수, 한도, 남은 횟수) 반환."""
    ip = client_ip or "unknown"
    with _lock:
        day = _today()
        bucket = _counts.setdefault(day, {})
        bucket[ip] = bucket.get(ip, 0) + 1
        used = bucket[ip]
        remaining = max(0, GUEST_DAILY_LIMIT - used)
        return used, GUEST_DAILY_LIMIT, remaining
