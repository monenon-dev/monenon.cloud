"""
Keymaker — 전역 키·환경(.env)·Gemini SDK 설정을 한 객체에서 관리합니다.
다른 모듈은 `get_keymaker()`만 사용하고, 직접 `load_dotenv` / `os.getenv`로 키를 읽지 않는 것을 권장합니다.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

import google.generativeai as genai
from dotenv import load_dotenv

# Monenon /chat — v1beta에서 지원되는 flash-lite (1.5-flash는 404)
_GEMINI_DEFAULT_MODEL = "gemini-2.5-flash-lite"
_GEMINI_FALLBACK_MODEL = "gemini-2.0-flash-lite"


@dataclass(frozen=True)
class GeminiChatProvision:
    """Keymaker가 인터랙터에 넘기는 Gemini 채팅 설정 (env 키 이름은 숨김)."""

    model_id: str
    fallback_model_id: str


class Keymaker:
    """백엔드 루트의 `.env` 로드, Gemini API 키, 모델 ID, `genai.configure` 멱등 적용."""

    _instance: Keymaker | None = None

    def __init__(self) -> None:
        # vault_keymaker_secret_manager.py → core/matrix → backend
        self._backend_root = Path(__file__).resolve().parent.parent.parent
        self._apps_dir = self._backend_root / "apps"
        self._env_loaded = False
        self._gemini_sdk_configured = False

    @classmethod
    def instance(cls) -> Keymaker:
        if cls._instance is None:
            cls._instance = Keymaker()
        return cls._instance

    @property
    def backend_root(self) -> Path:
        return self._backend_root

    @property
    def env_file(self) -> Path:
        return self._backend_root / ".env"

    def load_environment(self) -> None:
        """`backend/.env` 로드 (개발 중 .env 수정 반영을 위해 override)."""
        load_dotenv(self.env_file, override=True)
        self._env_loaded = True

    def require_gemini_api_key(self) -> str:
        """Gemini 호출에 필요한 API 키. 없으면 RuntimeError."""
        self.load_environment()
        key = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()
        if not key:
            raise RuntimeError(
                "GEMINI_API_KEY 또는 GOOGLE_API_KEY 환경 변수를 설정하세요. (.env 권장)"
            )
        return key

    def gemini_chat_model_id(self) -> str:
        """`POST /chat` — `GEMINI_CHAT_MODEL` → `GEMINI_MODEL` → 기본값."""
        self.load_environment()
        return (
            os.getenv("GEMINI_CHAT_MODEL")
            or os.getenv("GEMINI_MODEL")
            or _GEMINI_DEFAULT_MODEL
        ).strip()

    def gemini_default_model_id(self) -> str:
        """`/agent/chat`(Monenon UI) — `GEMINI_MODEL` → 기본값."""
        self.load_environment()
        return (os.getenv("GEMINI_MODEL") or _GEMINI_DEFAULT_MODEL).strip()

    def gemini_fallback_model_id(self) -> str:
        """할당량(429) 시 재시도할 모델 (`GEMINI_FALLBACK_MODEL` → 기본값)."""
        self.load_environment()
        return (os.getenv("GEMINI_FALLBACK_MODEL") or _GEMINI_FALLBACK_MODEL).strip()

    def openweather_api_key(self) -> str:
        """OpenWeather API 키 (`OPENWEATHER_API_KEY` 또는 `openweather_api_key`)."""
        self.load_environment()
        return (
            os.getenv("OPENWEATHER_API_KEY")
            or os.getenv("openweather_api_key")
            or ""
        ).strip()

    def openweather_default_city(self) -> str:
        """기본 조회 도시 (`OPENWEATHER_CITY`, 기본 Seoul)."""
        self.load_environment()
        return (os.getenv("OPENWEATHER_CITY") or "Seoul").strip()

    def redis_url(self) -> str:
        """Redis URL (`REDIS_URL`, Docker 기본 redis://redis:6379)."""
        self.load_environment()
        return (
            os.getenv("REDIS_URL") or "redis://redis:6379/0"
        ).strip()

    def ensure_gemini_sdk_configured(self) -> None:
        """`google.generativeai.configure(api_key=…)` 멱등 적용."""
        if self._gemini_sdk_configured:
            return
        genai.configure(api_key=self.require_gemini_api_key())
        self._gemini_sdk_configured = True

    def provide_gemini_chat(self) -> GeminiChatProvision:
        """API 키는 SDK에만 주입하고, 모델 ID만 인터랙터에 제공한다."""
        self.ensure_gemini_sdk_configured()
        return GeminiChatProvision(
            model_id=self.gemini_chat_model_id(),
            fallback_model_id=self.gemini_fallback_model_id(),
        )

    def reset_gemini_sdk_for_tests(self) -> None:
        """테스트용: SDK 설정 플래그만 초기화 (일반 앱 코드에서는 사용하지 않음)."""
        self._gemini_sdk_configured = False


def get_keymaker() -> Keymaker:
    return Keymaker.instance()
