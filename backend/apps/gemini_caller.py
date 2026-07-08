"""Google Gemini API 호출 — 키·SDK 설정은 core.matrix.vault_keymaker_secret_manager.Keymaker 가 담당합니다."""

from __future__ import annotations

import google.generativeai as genai
from core.matrix.vault_keymaker_secret_manager import get_keymaker


class GeminiQuotaError(RuntimeError):
    """무료/유료 할당량 초과(HTTP 429 등)."""


def _is_quota_error(exc: BaseException) -> bool:
    text = str(exc).lower()
    name = type(exc).__name__.lower()
    return (
        "429" in str(exc)
        or "quota" in text
        or "resource_exhausted" in text
        or "resourceexhausted" in name
    )


def _generate_once(model_name: str, text: str, *, temperature: float = 0.9) -> str:
    m = genai.GenerativeModel(
        model_name,
        generation_config={
            "temperature": temperature,
            "top_p": 0.95,
        },
    )
    response = m.generate_content(text)
    try:
        out = (response.text or "").strip()
    except ValueError:
        out = ""
    if out:
        return out
    fb = getattr(response, "prompt_feedback", None)
    raise RuntimeError(
        f"Gemini가 텍스트를 반환하지 않았습니다. (model={model_name}, feedback={fb})"
    )


def call_gemini(prompt: str, *, model: str | None = None) -> str:
    """
    사용자 프롬프트 한 번에 대한 Gemini 텍스트 응답.
    할당량(429)이면 설정된 fallback 모델로 한 번 더 시도합니다.
    """
    text = (prompt or "").strip()
    if not text:
        raise ValueError("prompt가 비었습니다.")

    km = get_keymaker()
    km.ensure_gemini_sdk_configured()
    primary = (model or km.gemini_default_model_id()).strip()
    fallback = km.gemini_fallback_model_id()

    models_to_try: list[str] = [primary]
    if fallback and fallback not in models_to_try:
        models_to_try.append(fallback)

    last_exc: BaseException | None = None
    for model_name in models_to_try:
        try:
            return _generate_once(model_name, text)
        except Exception as e:
            last_exc = e
            if _is_quota_error(e) and model_name != models_to_try[-1]:
                continue
            break

    assert last_exc is not None
    if _is_quota_error(last_exc):
        tried = ", ".join(models_to_try)
        raise GeminiQuotaError(
            "Gemini API 사용 한도에 도달했습니다. "
            "Google AI Studio(https://aistudio.google.com)에서 API 키·사용량·결제를 확인하거나 "
            "잠시 후 다시 시도해 주세요. "
            f"(시도한 모델: {tried})"
        ) from last_exc
    raise RuntimeError(str(last_exc)) from last_exc
