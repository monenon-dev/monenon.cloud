"""lol core — Ollama/EXAONE 클라이언트."""

from __future__ import annotations

import logging

import ollama

from lol.config import get_ollama_base_url, get_ollama_model

logger = logging.getLogger(__name__)


def _client() -> ollama.Client:
    return ollama.Client(host=get_ollama_base_url())


def chat(
    messages: list[dict],
    *,
    model: str | None = None,
    temperature: float = 0.2,
    num_predict: int | None = None,
) -> str:
    """EXAONE에게 메시지 전송 → 응답 텍스트 반환."""
    model_name = model or get_ollama_model()
    options: dict = {"temperature": temperature}
    if num_predict is not None:
        options["num_predict"] = num_predict
    try:
        response = _client().chat(
            model=model_name,
            messages=messages,
            options=options,
        )
        return response["message"]["content"].strip()
    except Exception as exc:
        logger.error("[lol/ollama] EXAONE 호출 실패: %s", exc)
        raise RuntimeError(f"EXAONE 호출 실패: {exc}") from exc


def embed(text: str, *, model: str = "nomic-embed-text") -> list[float]:
    """텍스트 임베딩 벡터 반환 (pgvector 저장용)."""
    try:
        response = _client().embeddings(model=model, prompt=text)
        return response["embedding"]
    except Exception as exc:
        logger.error("[lol/ollama] 임베딩 실패: %s", exc)
        raise RuntimeError(f"임베딩 실패: {exc}") from exc
