"""랜딩 데모 — 붙여넣은 텍스트 3줄 요약 + 할 일 1개 (stateless)."""

from __future__ import annotations

import json
import logging
import re

from gemini_caller import GeminiQuotaError, call_gemini

logger = logging.getLogger(__name__)

DOC_SUMMARY_MAX_CHARS = 3000

_DOC_SUMMARY_PROMPT = """다음 텍스트(회의록, 메모, 이메일 등)를 분석하세요.

요구사항:
1. summary_lines: 핵심 내용을 한국어로 3줄 이내 (각 줄은 한 문장, 배열 길이 1~3)
2. next_action: 텍스트에서 구체적인 할 일·액션 아이템·마감이 있으면 "다음 할 일: ..." 형식의 한 문장. 없으면 null

반드시 아래 JSON만 출력 (마크다운 코드블록 없이):
{{"summary_lines": ["...", "..."], "next_action": "다음 할 일: ..." 또는 null}}

텍스트:
{text}
"""


def _extract_json(raw: str) -> dict:
    start = raw.find("{")
    end = raw.rfind("}") + 1
    if start < 0 or end <= start:
        raise ValueError("JSON 응답을 찾지 못했습니다.")
    return json.loads(raw[start:end])


def _normalize_summary_lines(lines: object) -> list[str]:
    if not isinstance(lines, list):
        return []
    out: list[str] = []
    for item in lines:
        if not isinstance(item, str):
            continue
        line = item.strip()
        if line:
            out.append(line)
        if len(out) >= 3:
            break
    return out


def _normalize_next_action(value: object) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text or text.lower() in {"null", "none", "없음"}:
        return None
    if not text.startswith("다음 할 일"):
        text = re.sub(r"^[-•*]\s*", "", text)
        text = f"다음 할 일: {text.lstrip(':').strip()}"
    return text


def run_demo_doc_summary(text: str) -> dict[str, object]:
    """Gemini로 3줄 요약 + 할 일 1개를 생성한다. DB 저장 없음."""
    raw = (text or "").strip()
    if not raw:
        raise ValueError("텍스트를 입력해 주세요.")

    truncated = len(raw) > DOC_SUMMARY_MAX_CHARS
    body = raw[:DOC_SUMMARY_MAX_CHARS]

    try:
        reply = call_gemini(_DOC_SUMMARY_PROMPT.format(text=body))
        data = _extract_json(reply)
    except GeminiQuotaError:
        raise
    except Exception as exc:
        logger.exception("[demo.doc-summary] gemini failed")
        raise RuntimeError(f"문서 요약에 실패했습니다: {exc}") from exc

    summary_lines = _normalize_summary_lines(data.get("summary_lines"))
    if not summary_lines:
        raise RuntimeError("요약 결과를 만들지 못했습니다.")

    next_action = _normalize_next_action(data.get("next_action"))
    notice = "일부만 요약했어요" if truncated else None

    logger.info(
        "[demo.doc-summary] chars=%s truncated=%s lines=%s has_action=%s",
        len(raw),
        truncated,
        len(summary_lines),
        bool(next_action),
    )
    return {
        "summary_lines": summary_lines,
        "next_action": next_action,
        "truncated": truncated,
        "notice": notice,
    }
