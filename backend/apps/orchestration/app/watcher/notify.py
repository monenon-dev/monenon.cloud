"""감지된 이슈 묶음 메시지 생성·발송."""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.adapter.outbound.pg.integration_pg_repository import IntegrationPgRepository
from orchestration.adapter.outbound.pg.proactive_alert_pg_repository import (
    ProactiveAlertPgRepository,
)
from orchestration.app.briefing.briefing_notify import send_gmail_email, send_slack_dm
from orchestration.app.watcher.types import DetectedIssue
from secretary.adapter.outbound.orm.user_model import User

logger = logging.getLogger(__name__)

MONENON_LINK = "https://www.choseohee.com"


def bundle_proactive_message(issues: list[DetectedIssue]) -> str:
    if not issues:
        return ""
    if len(issues) == 1:
        issue = issues[0]
        return f"⚠️ {issue.summary}\n{issue.detail}\n\n자세히 보기: {MONENON_LINK}"

    lines = [f"⚠️ 지금 확인이 필요한 이슈 {len(issues)}건이 있어요."]
    for issue in issues[:5]:
        lines.append(f"• {issue.summary} — {issue.detail}")
    if len(issues) > 5:
        lines.append(f"• 외 {len(issues) - 5}건")
    lines.append(f"\n자세히 보기: {MONENON_LINK}")
    return "\n".join(lines)


async def filter_unsent_issues(
    session: AsyncSession,
    user_id: int,
    issues: list[DetectedIssue],
    *,
    suppress_hours: int = 24,
) -> list[DetectedIssue]:
    repo = ProactiveAlertPgRepository(session)
    fresh: list[DetectedIssue] = []
    for issue in issues:
        if await repo.was_sent_within(user_id, issue.trigger_key, hours=suppress_hours):
            continue
        fresh.append(issue)
    return fresh


async def deliver_proactive_notification(
    session: AsyncSession,
    *,
    user_id: int,
    issues: list[DetectedIssue],
) -> dict[str, Any]:
    """연동된 Slack/Gmail로 능동 알림 발송 (아침 브리핑과 동일 채널)."""
    if not issues:
        return {"status": "skipped", "reason": "no_issues"}

    message = bundle_proactive_message(issues)
    if not message:
        return {"status": "skipped", "reason": "empty_message"}

    integ_repo = IntegrationPgRepository(session)
    alert_repo = ProactiveAlertPgRepository(session)

    # 인앱 알림용으로 먼저 저장 (외부 채널 없어도 앱에서 확인 가능)
    for issue in issues:
        issue_msg = f"{issue.summary} — {issue.detail}".strip(" —")
        await alert_repo.record_sent(
            user_id=user_id,
            alert_type=issue.alert_type,
            trigger_key=issue.trigger_key,
            message=issue_msg or issue.summary,
        )

    channels_sent: list[str] = ["in_app"]
    errors: list[str] = []

    slack_row = await integ_repo.get(user_id, "slack")
    gmail_row = await integ_repo.get(user_id, "gmail")

    if integ_repo._is_connected(slack_row) and slack_row is not None:
        try:
            send_slack_dm(slack_row, message)
            channels_sent.append("slack_dm")
        except Exception as exc:
            logger.warning("[proactive_notify] slack user_id=%s: %s", user_id, exc)
            errors.append(f"slack: {exc}")

    if integ_repo._is_connected(gmail_row) and gmail_row is not None:
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
                    subject="[Moneo] ⚠️ 상황 알림",
                    body=message,
                )
                channels_sent.append("email")
            except Exception as exc:
                logger.warning("[proactive_notify] gmail user_id=%s: %s", user_id, exc)
                errors.append(f"email: {exc}")

    await session.commit()
    return {"status": "sent", "channels": channels_sent, "count": len(issues), "errors": errors}
