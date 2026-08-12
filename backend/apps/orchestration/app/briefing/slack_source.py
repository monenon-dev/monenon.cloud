"""브리핑용 Slack digest — 최근 24시간 메시지 요약."""

from __future__ import annotations

import asyncio
import logging
import re
import time
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from orchestration.adapter.outbound.pg.integration_pg_repository import IntegrationPgRepository

logger = logging.getLogger(__name__)

IMPORTANT_KEYWORDS = re.compile(
    r"deadline|urgent|asap|review|리뷰|긴급|마감|회신|확인\s*부탁",
    re.IGNORECASE,
)


def _skipped(reason: str = "not_connected", *, detail: str = "Slack 연동 안 됨") -> dict[str, Any]:
    return {
        "source": "slack",
        "status": "skipped",
        "tool": "slack.digest",
        "reason": reason,
        "detail": detail,
        "params": {"channels": 0},
        "items": [],
        "summary": detail,
    }


def _collect_slack_digest(
    token: str,
    *,
    channel_ids: list[str],
    slack_user_id: str | None,
) -> tuple[list[dict[str, str]], int]:
    from slack_sdk import WebClient
    from slack_sdk.errors import SlackApiError

    client = WebClient(token=token)
    oldest = str(time.time() - 86400)

    if not channel_ids:
        try:
            conv = client.conversations_list(
                types="public_channel,private_channel",
                exclude_archived=True,
                limit=50,
            )
            for ch in conv.get("channels") or []:
                if not isinstance(ch, dict):
                    continue
                if not ch.get("is_member"):
                    continue
                cid = ch.get("id")
                if isinstance(cid, str):
                    channel_ids.append(cid)
                if len(channel_ids) >= 5:
                    break
        except SlackApiError as exc:
            logger.warning("[briefing_slack] conversations_list: %s", exc)
            raise

    items: list[dict[str, str]] = []
    seen: set[str] = set()

    for channel_id in channel_ids[:8]:
        try:
            hist = client.conversations_history(
                channel=channel_id,
                oldest=oldest,
                limit=80,
            )
        except SlackApiError as exc:
            logger.warning("[briefing_slack] history channel=%s: %s", channel_id, exc)
            continue

        channel_name = channel_id
        try:
            info = client.conversations_info(channel=channel_id)
            ch = info.get("channel") if isinstance(info.get("channel"), dict) else {}
            name = ch.get("name")
            if isinstance(name, str) and name:
                channel_name = f"#{name}"
        except SlackApiError:
            pass

        for msg in hist.get("messages") or []:
            if not isinstance(msg, dict):
                continue
            text = (msg.get("text") or "").strip()
            if not text:
                continue
            ts = msg.get("ts")
            msg_user = msg.get("user")
            key = f"{channel_id}:{ts}"
            if key in seen:
                continue

            category = ""
            if slack_user_id and f"<@{slack_user_id}>" in text:
                category = "mention"
            elif slack_user_id and msg_user == slack_user_id:
                reply_count = int(msg.get("reply_count") or 0)
                if reply_count == 0 and not msg.get("thread_ts"):
                    category = "unreplied"
            elif IMPORTANT_KEYWORDS.search(text):
                category = "keyword"

            if not category:
                continue

            seen.add(key)
            preview = text.replace("\n", " ")
            if len(preview) > 120:
                preview = preview[:117] + "…"
            meta = channel_name
            if category == "mention":
                meta = f"{channel_name} · 멘션"
            elif category == "unreplied":
                meta = f"{channel_name} · 미응답"
            elif category == "keyword":
                meta = f"{channel_name} · 키워드"

            items.append(
                {
                    "title": preview[:60] or "메시지",
                    "meta": meta,
                    "preview": preview,
                }
            )
            if len(items) >= 15:
                break
        if len(items) >= 15:
            break

    return items, len(channel_ids)


async def fetch_slack_digest(session: AsyncSession, user_id: int) -> dict[str, Any]:
    """Slack Bot Token으로 최근 24시간 digest. 연동 없으면 skipped."""
    repo = IntegrationPgRepository(session)
    row = await repo.get(user_id, "slack")
    if not repo._is_connected(row):
        return _skipped()

    token = (row.access_token or "").strip()
    meta = row.metadata_json if isinstance(row.metadata_json, dict) else {}
    channel_ids = [
        str(x).strip()
        for x in (meta.get("channel_ids") or [])
        if isinstance(x, str) and str(x).strip()
    ]
    slack_user_id = meta.get("slack_user_id")
    uid = slack_user_id if isinstance(slack_user_id, str) else None

    try:
        items, channel_count = await asyncio.to_thread(
            _collect_slack_digest,
            token,
            channel_ids=channel_ids,
            slack_user_id=uid,
        )
    except Exception as exc:
        logger.warning("[briefing_slack] fetch failed user_id=%s: %s", user_id, exc)
        return {
            "source": "slack",
            "status": "error",
            "tool": "slack.digest",
            "reason": str(exc),
            "params": {"channels": len(channel_ids)},
            "items": [],
        }

    if not items:
        return {
            "source": "slack",
            "status": "empty",
            "tool": "slack.digest",
            "params": {"channels": channel_count, "since": "24h"},
            "items": [],
            "summary": "최근 24시간 Slack 알림 대상 메시지 없음",
        }

    return {
        "source": "slack",
        "status": "success",
        "tool": "slack.digest",
        "params": {"channels": channel_count, "since": "24h", "hits": len(items)},
        "items": items,
        "summary": f"Slack 요약 {len(items)}건 (멘션·미응답·키워드)",
    }
