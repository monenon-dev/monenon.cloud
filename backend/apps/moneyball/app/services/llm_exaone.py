"""Moneyball EXAONE 호출 — AWQ HTTP(우선) 또는 Ollama."""

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


def get_exaone_http_url() -> str:
    return os.getenv("EXAONE_HTTP_URL", "http://172.17.0.1:11435").rstrip("/")


def llm_backend() -> str:
    """awq_http | ollama | auto | heuristic."""
    return os.getenv("MONEYBALL_LLM_MODE", "auto").strip().lower()


def llm_enabled() -> bool:
    return llm_backend() != "heuristic"


def extract_json_object(text: str) -> dict[str, Any]:
    match = _JSON_BLOCK.search(text)
    if not match:
        raise ValueError("JSON 객체를 찾지 못했습니다.")
    return json.loads(match.group(0))


def _role_for_model(model: str) -> str:
    name = model.lower()
    if "2.4" in name or "spoke" in name:
        return "spoke"
    if "7.8" in name or "7b" in name or "hub" in name:
        return "hub"
    # Moneyball defaults: hub=7.8b, spoke=2.4b
    if model == get_spoke_model():
        return "spoke"
    return "hub"


def _chat_awq_http(
    messages: list[dict[str, str]],
    *,
    model: str,
    temperature: float,
) -> str:
    import urllib.error
    import urllib.request

    url = f"{get_exaone_http_url()}/chat"
    payload = {
        "messages": messages,
        "role": _role_for_model(model),
        "temperature": temperature,
        "max_new_tokens": 512,
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.URLError as exc:
        raise RuntimeError(f"EXAONE HTTP 호출 실패: {exc}") from exc
    content = data.get("content")
    if not isinstance(content, str):
        raise RuntimeError("EXAONE HTTP 응답에 content가 없습니다.")
    return content.strip()


def _chat_ollama(
    messages: list[dict[str, str]],
    *,
    model: str,
    temperature: float,
) -> str:
    from lol.ollama import chat as ollama_chat

    return ollama_chat(messages, model=model, temperature=temperature)


def chat_exaone(
    messages: list[dict[str, str]],
    *,
    model: str,
    temperature: float = 0.1,
) -> str:
    """EXAONE에게 메시지 전송 → 응답 텍스트.

    MONEYBALL_LLM_MODE:
      - awq_http: scripts/exaone/serve_exaone.py
      - ollama: Ollama 태그
      - auto: awq_http 먼저, 실패 시 ollama
      - heuristic: (상위 llm_enabled=False)
    """
    mode = llm_backend()
    if mode == "awq_http":
        return _chat_awq_http(messages, model=model, temperature=temperature)
    if mode == "ollama":
        return _chat_ollama(messages, model=model, temperature=temperature)

    # auto
    try:
        return _chat_awq_http(messages, model=model, temperature=temperature)
    except Exception as awq_exc:
        logger.warning("[moneyball] AWQ HTTP 실패, Ollama 시도: %s", awq_exc)
        try:
            return _chat_ollama(messages, model=model, temperature=temperature)
        except Exception as oll_exc:
            raise RuntimeError(
                f"EXAONE 호출 실패 (awq={awq_exc}; ollama={oll_exc})"
            ) from oll_exc
