"""Kiwi 한국어 전처리 + Ollama(qwen2.5:3b) 연동 테스트.

이 파일만 실행:
    cd backend
    python -m pytest -c pytest-korean-ai.ini -v
"""

from __future__ import annotations

import asyncio
from unittest.mock import MagicMock

import ollama
import pytest

from titanic.app.use_cases.passenger_jack_trainer_interactor import JackTrainerInteractor

_DEFAULT_MODEL = "qwen2.5:3b"
_SAMPLE_QUESTION = (
    "자연어처리는 넘흐 재밌어요. 올라마와 키위 라이브러리의 장점을 짧게 요약해줘."
)


@pytest.fixture
def jack_interactor() -> JackTrainerInteractor:
    return JackTrainerInteractor(repository=MagicMock())


def run_korean_ai(user_text: str, *, model: str = _DEFAULT_MODEL) -> str:
    interactor = JackTrainerInteractor(repository=MagicMock())
    result = asyncio.run(interactor.preprocess_message(user_text))
    cleaned_text = result["cleaned_text"]
    response = ollama.chat(
        model=model,
        messages=[{"role": "user", "content": cleaned_text}],
    )
    return response["message"]["content"]


def _ollama_has_qwen_model() -> bool:
    try:
        listed = ollama.list()
        models = listed.get("models", [])
        for item in models:
            name = item.get("model") or item.get("name") or ""
            if _DEFAULT_MODEL in name:
                return True
        return False
    except Exception:
        return False


# --- pytest (단위: Kiwi만) ---


async def test_preprocess_korean_returns_cleaned_text(jack_interactor: JackTrainerInteractor):
    result = await jack_interactor.preprocess_message(_SAMPLE_QUESTION)
    assert result["cleaned_text"]
    assert isinstance(result["cleaned_text"], str)


async def test_preprocess_korean_extracts_nouns(jack_interactor: JackTrainerInteractor):
    result = await jack_interactor.preprocess_message(_SAMPLE_QUESTION)
    nouns = result["nouns"]
    assert "자연어처리" in nouns or "올라마" in nouns or len(nouns) > 0


# --- pytest (통합: Ollama 필요) ---


@pytest.mark.ollama
@pytest.mark.skipif(not _ollama_has_qwen_model(), reason=f"Ollama 또는 {_DEFAULT_MODEL} 미설치")
def test_run_korean_ai_returns_non_empty_answer():
    answer = run_korean_ai(_SAMPLE_QUESTION)
    assert answer
    assert isinstance(answer, str)
    assert len(answer.strip()) > 0


# --- 수동 실행 (기존 test.py 동작) ---


if __name__ == "__main__":
    interactor = JackTrainerInteractor(repository=MagicMock())
    print("\n--- [1단계] 입력 문장 전처리 중... ---")
    result = asyncio.run(interactor.preprocess_message(_SAMPLE_QUESTION))
    print(f"원본 문장: {_SAMPLE_QUESTION}")
    print(f"정제된 문장: {result['cleaned_text']}")
    print(f"추출된 핵심 명사: {result['nouns']}")

    print("\n--- [2단계] Qwen2.5 3B 모델 추론 중... ---")
    answer = run_korean_ai(_SAMPLE_QUESTION)

    print("\n--- [3단계] AI 최종 답변 ---")
    print(answer)
