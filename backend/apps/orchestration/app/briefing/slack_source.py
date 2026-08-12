"""브리핑·능동 감시용 Slack 소스 — Bot Token digest.

브리핑: 최근 24h 멘션·키워드·미응답 메시지 요약.
watcher: 동일 기간 긴급 키워드 + 본인 멘션만 ``DetectedIssue`` 로 추출.
미연동은 ``skipped`` (그래프/감시 체인 중단 없음). API 오류만 ``error``.
"""

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
URGENT_KEYWORDS = re.compile(
    r"deadline|urgent|asap|긴급|마감",
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
    since_seconds: float = 86400,
    urgent_only: bool = False,
) -> tuple[list[dict[str, str]], int, list[dict[str, str]]]:
    from slack_sdk import WebClient
    from slack_sdk.errors import SlackApiError

    client = WebClient(token=token)
    oldest = str(time.time() - since_seconds)

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
    urgent_hits: list[dict[str, str]] = []
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
            has_mention = bool(slack_user_id and f"<@{slack_user_id}>" in text)
            has_urgent = bool(URGENT_KEYWORDS.search(text))
            if has_mention and has_urgent:
                category = "urgent_mention"
            elif slack_user_id and has_mention:
                category = "mention"
            elif slack_user_id and msg_user == slack_user_id:
                reply_count = int(msg.get("reply_count") or 0)
                if reply_count == 0 and not msg.get("thread_ts"):
                    category = "unreplied"
            elif IMPORTANT_KEYWORDS.search(text):
                category = "keyword"

            if urgent_only and category != "urgent_mention":
                continue
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
                    "channel_id": channel_id,
                    "ts": str(ts or ""),
                }
            )
            if category == "urgent_mention":
                urgent_hits.append(
                    {
                        "title": preview[:60] or "메시지",
                        "meta": meta,
                        "preview": preview,
                        "channel_id": channel_id,
                        "ts": str(ts or ""),
                    }
                )
            if len(items) >= 15:
                break
        if len(items) >= 15:
            break

    return items, len(channel_ids), urgent_hits


async def fetch_slack_digest(session: AsyncSession, user_id: int) -> dict[str, Any]:
    """브리핑 그래프용 — 최근 24시간 Slack digest.

    미연동 → ``skipped``. 메시지 없음 → ``empty``. API 실패 → ``error``.
    """
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
        items, channel_count, _ = await asyncio.to_thread(
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


async def fetch_slack_urgent_since(
    session: AsyncSession,
    user_id: int,
    *,
    since_seconds: float,
) -> dict[str, Any]:
    """watcher용 — ``since_seconds`` 이내 긴급 키워드 + 본인 멘션 메시지.

    미연동 → ``skipped`` + 빈 issues. API 실패 → ``error`` + 빈 issues.
    """
    from orchestration.app.watcher.types import DetectedIssue

    repo = IntegrationPgRepository(session)
    row = await repo.get(user_id, "slack")
    if not repo._is_connected(row):
        return {"source": "slack", "status": "skipped", "issues": []}

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
        _, channel_count, urgent_hits = await asyncio.to_thread(
            _collect_slack_digest,
            token,
            channel_ids=channel_ids,
            slack_user_id=uid,
            since_seconds=since_seconds,
            urgent_only=True,
        )
    except Exception as exc:
        logger.warning("[slack_urgent] fetch failed user_id=%s: %s", user_id, exc)
        return {"source": "slack", "status": "error", "issues": []}

    issues: list[DetectedIssue] = []
    for hit in urgent_hits:
        cid = hit.get("channel_id") or "?"
        ts = hit.get("ts") or "?"
        issues.append(
            DetectedIssue(
                alert_type="slack_urgent",
                trigger_key=f"slack:{cid}:{ts}",
                summary="Slack 긴급 멘션",
                detail=hit.get("preview") or hit.get("title") or "긴급 메시지",
            )
        )
    return {
        "source": "slack",
        "status": "success",
        "params": {"channels": channel_count, "since_seconds": since_seconds},
        "issues": issues,
    }
