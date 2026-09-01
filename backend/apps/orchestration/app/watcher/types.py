"""감지된 능동 알림 후보."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class DetectedIssue:
    alert_type: str
    trigger_key: str
    summary: str
    detail: str
