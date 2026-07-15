"""Moneyball EXAONE (Ollama) 호출 — 허브/스포크 모델 분리."""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

logger = logging.getLogger(__name__)

_JSON_BLOCK = re.compile(r"\{[\s\S]*\}")


def get_hub_model() -> str:
    return os.getenv("MONEYBALL_HUB_MODEL", "exaone3.5:7.8b")


def get_spoke_model() -> str:
    return os.getenv("MONEYBALL_SPOKE_MODEL", "exaone3.5:2.4b")


def llm_enabled() -> bool:
    """auto(기본): Ollama 시도. heuristic: LLM 생략. ollama: 강제 시도."""
    mode = os.getenv("MONEYBALL_LLM_MODE", "auto").strip().lower()
    return mode != "heuristic"


def extract_json_object(text: str) -> dict[str, Any]:
    match = _JSON_BLOCK.search(text)
    if not match:
        raise ValueError("JSON 객체를 찾지 못했습니다.")
    return json.loads(match.group(0))


def chat_exaone(
    messages: list[dict[str, str]],
    *,
    model: str,
    temperature: float = 0.1,
) -> str:
    from lol.ollama import chat as ollama_chat

    return ollama_chat(messages, model=model, temperature=temperature)
