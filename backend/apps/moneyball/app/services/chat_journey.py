"""Moneyball 채팅 요청 경로 로그 — 매 요청마다 단계별 journey 기록."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import UTC, datetime
from typing import Any

logger = logging.getLogger("moneyball.journey")


class ChatJourney:
    """질문이 지나는 경로를 단계별로 기록한다."""

    def __init__(self, question: str, *, request_id: str | None = None) -> None:
        self.request_id = request_id or uuid.uuid4().hex[:12]
        self.question = question
        self.events: list[dict[str, Any]] = []

    def log(self, stage: str, **fields: Any) -> None:
        event: dict[str, Any] = {
            "request_id": self.request_id,
            "stage": stage,
            "ts": datetime.now(UTC).isoformat(),
            **fields,
        }
        self.events.append(event)
        logger.info("[moneyball/journey] %s", json.dumps(event, ensure_ascii=False, default=str))

    def to_list(self) -> list[dict[str, Any]]:
        return list(self.events)
