"""브리핑 생성 후 Slack DM · 이메일 알림 발송."""

from __future__ import annotations

import base64
import logging
import re
from datetime import datetime, timezone
from email.mime.text import MIMEText
from typing import Any

import httpx
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.adapter.outbound.orm.daily_briefing_orm import DailyBriefing
from orchestration.adapter.outbound.orm.user_integration_orm import UserIntegration
from orchestration.adapter.outbound.pg.daily_briefing_pg_repository import (
    DailyBriefingPgRepository,
)
from orchestration.adapter.outbound.pg.integration_pg_repository import IntegrationPgRepository
from orchestration.adapter.outbound.pg.proactive_alert_pg_repository import (
    ProactiveAlertPgRepository,
)
from orchestration.app.integrations.gmail_oauth import refresh_gmail_access_token
from secretary.adapter.outbound.orm.user_model import User

logger = logging.getLogger(__name__)

BRIEFING_LINK = "https://www.choseohee.com"
GMAIL_SEND_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"


def briefing_summary_lines(content: str, *, max_lines: int = 3) -> list[str]:
    """브리핑 본문에서 요약 3줄 추출."""
    lines: list[str] = []
    for raw in content.splitlines():
        stripped = re.sub(r"^#+\s*", "", raw.strip())
        stripped = re.sub(r"^[-*]\s*", "", stripped).strip()
        if not stripped or len(stripped) < 2:
            continue
        if stripped.startswith("```"):
            continue
        lines.append(stripped)
        if len(lines) >= max_lines:
            break
    if not lines:
        fallback = content.strip() or "오늘의 브리핑이 준비되었습니다."
        lines = [fallback[:200]]
    return lines[:max_lines]


def build_notification_body(content: str) -> str:
    summary = briefing_summary_lines(content)
    bullets = "\n".join(f"• {line}" for line in summary)
    return (
        "오늘의 업무 브리핑\n\n"
        f"{bullets}\n\n"
        f"전체 브리핑 보기: {BRIEFING_LINK}"
    )


def _briefing_notify_enabled(row: UserIntegration | None) -> bool:
    if row is None or not row.enabled:
        return False
    if not (row.access_token or "").strip():
        return False
    meta = row.metadata_json if isinstance(row.metadata_json, dict) else {}
    return bool(meta.get("briefing_notify"))


async def _ensure_gmail_token(
    session: AsyncSession,
    integ_repo: IntegrationPgRepository,
    row: UserIntegration,
) -> str:
    token = (row.access_token or "").strip()
    if not token:
        raise ValueError("Gmail access_token 없음")
    expires_at = row.expires_at
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if (
        expires_at is not None
        and expires_at < datetime.now(timezone.utc)
        and (row.refresh_token or "").strip()
    ):
        refreshed = await refresh_gmail_access_token(row.refresh_token.strip())
        token = refreshed["access_token"]
        await integ_repo.update_tokens(
            row,
            access_token=token,
            expires_at=refreshed.get("expires_at"),
        )
    return token


def send_slack_dm(row: UserIntegration, message: str) -> None:
    meta = row.metadata_json if isinstance(row.metadata_json, dict) else {}
    slack_user_id = meta.get("slack_user_id")
    if not isinstance(slack_user_id, str) or not slack_user_id.strip():
        raise ValueError("Slack slack_user_id 없음 — OAuth 재연동이 필요합니다.")

    client = WebClient(token=row.access_token)
    try:
        opened = client.conversations_open(users=slack_user_id.strip())
        channel = opened.get("channel", {}).get("id") if isinstance(opened, dict) else None
        if not isinstance(channel, str) or not channel:
            raise ValueError("Slack DM 채널을 열지 못했습니다.")
        client.chat_postMessage(channel=channel, text=message)
    except SlackApiError as exc:
        err = exc.response.get("error") if exc.response else str(exc)
        raise ValueError(f"Slack 발송 실패: {err}") from exc


async def send_gmail_email(
    session: AsyncSession,
    integ_repo: IntegrationPgRepository,
    row: UserIntegration,
    *,
    to_email: str,
    subject: str,
    body: str,
) -> None:
    token = await _ensure_gmail_token(session, integ_repo, row)
    mime = MIMEText(body, "plain", "utf-8")
    mime["To"] = to_email
    mime["Subject"] = subject
    raw = base64.urlsafe_b64encode(mime.as_bytes()).decode("ascii").rstrip("=")

    async with httpx.AsyncClient(timeout=20.0) as client:
        res = await client.post(
            GMAIL_SEND_URL,
            headers={"Authorization": f"Bearer {token}"},
            json={"raw": raw},
        )
        if res.status_code >= 400:
            detail = res.text[:200]
            raise ValueError(f"Gmail 발송 실패 ({res.status_code}): {detail}")


async def deliver_briefing_notification(
    session: AsyncSession,
    *,
    user_id: int,
    briefing: DailyBriefing,
) -> dict[str, Any]:
    """연동·설정에 따라 Slack DM / 이메일로 브리핑 요약 발송."""
    if briefing.notified_at is not None:
        return {"status": "skipped", "reason": "already_notified"}

    integ_repo = IntegrationPgRepository(session)
    briefing_repo = DailyBriefingPgRepository(session)
    slack_row = await integ_repo.get(user_id, "slack")
    gmail_row = await integ_repo.get(user_id, "gmail")

    slack_wanted = _briefing_notify_enabled(slack_row)
    gmail_wanted = _briefing_notify_enabled(gmail_row)
    if not slack_wanted and not gmail_wanted:
        return {"status": "skipped", "reason": "notify_disabled"}

    message = build_notification_body(briefing.content or "")
    channels_sent: list[str] = []
    errors: list[str] = []

    if slack_wanted and slack_row is not None:
        try:
            send_slack_dm(slack_row, message)
            channels_sent.append("slack_dm")
        except Exception as exc:
            logger.warning("[briefing_notify] slack user_id=%s: %s", user_id, exc)
            errors.append(f"slack: {exc}")

    if gmail_wanted and gmail_row is not None:
        user_row = await session.execute(select(User.email).where(User.id == user_id))
        to_email = user_row.scalar_one_or_none()
        if not isinstance(to_email, str) or not to_email.strip():
            errors.append("email: 사용자 이메일 없음")
        else:
            try:
                await send_gmail_email(
                    session,
                    integ_repo,
                    gmail_row,
                    to_email=to_email.strip(),
                    subject="[Moneo] 오늘의 업무 브리핑",
                    body=message,
                )
                channels_sent.append("email")
            except Exception as exc:
                logger.warning("[briefing_notify] gmail user_id=%s: %s", user_id, exc)
                errors.append(f"email: {exc}")

    if channels_sent:
        channel_label = ",".join(channels_sent)
        await briefing_repo.mark_notified(
            briefing.id,
            channel=channel_label,
        )
        summary = briefing_summary_lines(briefing.content or "")
        await ProactiveAlertPgRepository(session).record_sent(
            user_id=user_id,
            alert_type="morning_briefing",
            trigger_key=f"morning_briefing:{briefing.briefing_date.isoformat()}",
            message=summary[0] if summary else "오늘의 브리핑이 준비되었습니다.",
        )
        await session.commit()
        return {
            "status": "sent",
            "channels": channels_sent,
            "errors": errors,
        }

    await session.rollback()
    return {
        "status": "failed",
        "errors": errors or ["no_channel_sent"],
    }
