"""검증 실패 시 사용자 검토(review) 모드용 콘텐츠 분리."""

from __future__ import annotations

import re
from typing import Any

_DOCS_HALLUCINATION_MARKERS = (
    "문서 저장소",
    "q3-roadmap",
    "Q3 로드맵",
    "North-star KPI",
    "브리핑 목표 시간 45초",
)

_SLACK_PATTERN = re.compile(r"슬랙|slack|#\w+", re.IGNORECASE)
_GMAIL_PATTERN = re.compile(r"gmail|이메일\s*함|메일\s*함|inbox", re.IGNORECASE)


def _split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?。])\s+|\n+", text.strip())
    return [p.strip() for p in parts if p.strip()]


def _matches_docs_hallucination(sentence: str) -> bool:
    lower = sentence.lower()
    return any(marker.lower() in lower for marker in _DOCS_HALLUCINATION_MARKERS)


def extract_flagged_segments(answer: str, failure_reasons: list[str]) -> list[str]:
    """검증 실패 사유에 해당하는 문장·단락을 추출한다."""
    if not answer.strip():
        return []

    flagged: list[str] = []
    reasons_joined = " ".join(failure_reasons)

    for sentence in _split_sentences(answer):
        if "문서" in reasons_joined and _matches_docs_hallucination(sentence):
            flagged.append(sentence)
            continue
        if "Slack" in reasons_joined and _SLACK_PATTERN.search(sentence):
            flagged.append(sentence)
            continue
        if "Gmail" in reasons_joined and _GMAIL_PATTERN.search(sentence):
            flagged.append(sentence)
            continue

    if flagged:
        return flagged

    paragraphs = [p.strip() for p in answer.split("\n\n") if p.strip()]
    if paragraphs:
        return [paragraphs[-1]]
    return [answer[:400]]


def strip_flagged_segments(answer: str, flagged_segments: list[str]) -> str:
    """플래그된 문장을 제거한 브리핑 본문."""
    cleaned = answer
    for segment in flagged_segments:
        if segment in cleaned:
            cleaned = cleaned.replace(segment, "").strip()
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def build_pending_review_payload(
    answer: str,
    failure_reasons: list[str],
) -> tuple[str, dict[str, str]]:
    """(검증된 본문, pending_review dict) 반환."""
    flagged = extract_flagged_segments(answer, failure_reasons)
    flagged_text = "\n\n".join(flagged).strip() or answer[:400].strip()
    clean = strip_flagged_segments(answer, flagged)
    reason = failure_reasons[0] if failure_reasons else "검증 실패"
    if " — " in reason:
        reason = reason.split(" — ", 1)[0].strip()
    pending: dict[str, str] = {
        "content": flagged_text,
        "reason": reason,
    }
    if not clean:
        clean = answer.strip()
    return clean, pending


def normalize_pending_review(value: Any) -> dict[str, str] | None:
    if not isinstance(value, dict):
        return None
    content = value.get("content")
    reason = value.get("reason")
    if not isinstance(content, str) or not content.strip():
        return None
    return {
        "content": content.strip(),
        "reason": reason.strip() if isinstance(reason, str) else "검증 실패",
    }
