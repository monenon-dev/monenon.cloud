"""브리핑용 Gmail digest — 최근 24시간 미읽음."""

from __future__ import annotations

import asyncio
import base64
import logging
import re
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.adapter.outbound.pg.integration_pg_repository import IntegrationPgRepository
from orchestration.app.integrations.gmail_oauth import refresh_gmail_access_token

logger = logging.getLogger(__name__)

REPLY_NEEDED = re.compile(
    r"action required|please reply|회신|답변\s*부탁|확인\s*부탁|검토|review|urgent|deadline|긴급|마감",
    re.IGNORECASE,
)
DEADLINE_KEYWORDS = re.compile(
    r"오늘\s*까지|당일\s*마감|긴급|urgent|asap|deadline|마감\s*임박|due\s*today",
    re.IGNORECASE,
)


def _skipped(*, detail: str = "Gmail 연동 안 됨") -> dict[str, Any]:
    return {
        "source": "gmail",
        "status": "skipped",
        "tool": "gmail.digest",
        "reason": "not_connected",
        "detail": detail,
        "params": {"unread": 0},
        "items": [],
        "summary": detail,
    }


def _decode_header(headers: list[dict[str, str]] | None, name: str) -> str:
    if not headers:
        return ""
    for h in headers:
        if h.get("name", "").lower() == name.lower():
            return (h.get("value") or "").strip()
    return ""


def _decode_snippet(payload: dict[str, Any]) -> str:
    body = payload.get("body") or {}
    data = body.get("data")
    if isinstance(data, str) and data:
        try:
            raw = base64.urlsafe_b64decode(data + "==")
            return raw.decode("utf-8", errors="replace")[:500]
        except Exception:
            pass
    for part in payload.get("parts") or []:
        if not isinstance(part, dict):
            continue
        mime = part.get("mimeType")
        if mime == "text/plain":
            text = _decode_snippet(part)
            if text:
                return text
    return ""


def _fetch_gmail(
    access_token: str,
    *,
    refresh_token: str | None,
    client_id: str,
    client_secret: str,
    query: str = "is:unread newer_than:1d",
) -> tuple[list[dict[str, str]], str | None, datetime | None]:
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build

    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=client_id,
        client_secret=client_secret,
        scopes=["https://www.googleapis.com/auth/gmail.readonly"],
    )
    service = build("gmail", "v1", credentials=creds, cache_discovery=False)
    listed = (
        service.users()
        .messages()
        .list(userId="me", q=query, maxResults=20)
        .execute()
    )
    msg_ids = [
        m.get("id")
        for m in (listed.get("messages") or [])
        if isinstance(m, dict) and isinstance(m.get("id"), str)
    ]

    items: list[dict[str, str]] = []
    for mid in msg_ids:
        detail = service.users().messages().get(userId="me", id=mid, format="full").execute()
        payload = detail.get("payload") if isinstance(detail.get("payload"), dict) else {}
        headers = payload.get("headers") if isinstance(payload.get("headers"), list) else []
        subject = _decode_header(headers, "Subject") or "(제목 없음)"
        sender = _decode_header(headers, "From") or "unknown"
        snippet = (detail.get("snippet") or _decode_snippet(payload) or "").strip()
        combined = f"{subject} {snippet}"
        needs_reply = bool(REPLY_NEEDED.search(combined))
        importance = "회신 필요" if needs_reply else "참고"
        preview = snippet[:120] + ("…" if len(snippet) > 120 else "")
        items.append(
            {
                "title": subject[:80],
                "meta": f"{sender[:40]} · {importance}",
                "preview": preview or subject,
                "message_id": mid,
            }
        )

    new_token = None
    new_expires = None
    if creds.token and creds.token != access_token:
        new_token = creds.token
        if creds.expiry:
            new_expires = creds.expiry.replace(tzinfo=timezone.utc)

    return items, new_token, new_expires


async def fetch_gmail_digest(session: AsyncSession, user_id: int) -> dict[str, Any]:
    """Gmail OAuth로 최근 24시간 미읽음. 연동 없으면 skipped."""
    import os

    repo = IntegrationPgRepository(session)
    row = await repo.get(user_id, "gmail")
    if not repo._is_connected(row):
        return _skipped()

    access_token = (row.access_token or "").strip()
    refresh_token = (row.refresh_token or "").strip() or None

    if row.expires_at and row.expires_at < datetime.now(timezone.utc) and refresh_token:
        try:
            refreshed = await refresh_gmail_access_token(refresh_token)
            access_token = refreshed["access_token"]
            await repo.update_tokens(
                row,
                access_token=access_token,
                expires_at=refreshed.get("expires_at"),
            )
        except Exception as exc:
            logger.warning("[briefing_gmail] refresh failed user_id=%s: %s", user_id, exc)
            return _skipped(detail="Gmail 연동 안 됨 (토큰 만료)")

    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        return {
            "source": "gmail",
            "status": "error",
            "tool": "gmail.digest",
            "reason": "google_oauth_not_configured",
            "items": [],
        }

    try:
        items, new_token, new_expires = await asyncio.to_thread(
            _fetch_gmail,
            access_token,
            refresh_token=refresh_token,
            client_id=client_id,
            client_secret=client_secret,
        )
        if new_token:
            await repo.update_tokens(row, access_token=new_token, expires_at=new_expires)
    except Exception as exc:
        logger.warning("[briefing_gmail] fetch failed user_id=%s: %s", user_id, exc)
        return {
            "source": "gmail",
            "status": "error",
            "tool": "gmail.digest",
            "reason": str(exc),
            "items": [],
        }

    if not items:
        return {
            "source": "gmail",
            "status": "empty",
            "tool": "gmail.digest",
            "params": {"unread": 0, "since": "24h"},
            "items": [],
            "summary": "최근 24시간 미읽음 메일 없음",
        }

    return {
        "source": "gmail",
        "status": "success",
        "tool": "gmail.digest",
        "params": {"unread": len(items), "since": "24h"},
        "items": items,
        "summary": f"미읽음 메일 {len(items)}건",
    }


async def fetch_gmail_deadline_since(
    session: AsyncSession,
    user_id: int,
    *,
    since_hours: float,
) -> dict[str, Any]:
    """감시 주기 내 마감 임박 표현이 있는 미읽음 메일."""
    import os

    from orchestration.app.watcher.types import DetectedIssue

    repo = IntegrationPgRepository(session)
    row = await repo.get(user_id, "gmail")
    if not repo._is_connected(row):
        return {"source": "gmail", "status": "skipped", "issues": []}

    access_token = (row.access_token or "").strip()
    refresh_token = (row.refresh_token or "").strip() or None

    if row.expires_at and row.expires_at < datetime.now(timezone.utc) and refresh_token:
        try:
            refreshed = await refresh_gmail_access_token(refresh_token)
            access_token = refreshed["access_token"]
            await repo.update_tokens(
                row,
                access_token=access_token,
                expires_at=refreshed.get("expires_at"),
            )
        except Exception as exc:
            logger.warning("[gmail_deadline] refresh failed user_id=%s: %s", user_id, exc)
            return {"source": "gmail", "status": "skipped", "issues": []}

    client_id = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        return {"source": "gmail", "status": "error", "issues": []}

    hours = max(1, int(since_hours))
    query = f"is:unread newer_than:{hours}h"
    try:
        items, new_token, new_expires = await asyncio.to_thread(
            _fetch_gmail,
            access_token,
            refresh_token=refresh_token,
            client_id=client_id,
            client_secret=client_secret,
            query=query,
        )
        if new_token:
            await repo.update_tokens(row, access_token=new_token, expires_at=new_expires)
    except Exception as exc:
        logger.warning("[gmail_deadline] fetch failed user_id=%s: %s", user_id, exc)
        return {"source": "gmail", "status": "error", "issues": []}

    issues: list[DetectedIssue] = []
    for item in items:
        combined = f"{item.get('title', '')} {item.get('preview', '')}"
        if not DEADLINE_KEYWORDS.search(combined):
            continue
        mid = item.get("message_id") or item.get("title") or "?"
        issues.append(
            DetectedIssue(
                alert_type="gmail_deadline",
                trigger_key=f"gmail:{mid}",
                summary="마감 임박 메일",
                detail=item.get("title") or "긴급 메일",
            )
        )
    return {
        "source": "gmail",
        "status": "success",
        "params": {"since_hours": hours, "hits": len(issues)},
        "issues": issues,
    }
