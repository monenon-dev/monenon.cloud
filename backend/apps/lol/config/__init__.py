"""lol core — 환경변수 설정."""

from __future__ import annotations

import os
from pathlib import Path


def get_neo4j_uri() -> str:
    return os.getenv("NEO4J_URI", "bolt://neo4j:7687")


def get_neo4j_user() -> str:
    return os.getenv("NEO4J_USER", "neo4j")


def get_neo4j_password() -> str:
    return os.getenv("NEO4J_PASSWORD", "monenon2026")


def get_ollama_base_url() -> str:
    """OLLAMA_BASE_URL. 미설정 시 Docker→ollama 서비스, 로컬→127.0.0.1."""
    explicit = (os.getenv("OLLAMA_BASE_URL") or "").strip()
    if explicit:
        return explicit.rstrip("/")
    if Path("/.dockerenv").is_file():
        return "http://ollama:11434"
    return "http://127.0.0.1:11434"


def get_ollama_model() -> str:
    """로컬 Hub LLM (PoC 기본: Qwen2.5-1.5B-Instruct)."""
    return (
        os.getenv("OLLAMA_MODEL")
        or os.getenv("POC_HUB_MODEL")
        or "qwen2.5:1.5b-instruct"
    ).strip()


def get_poc_hub_model() -> str:
    """Gateway 입구 분류 + Moneyball hub/spoke 공통 PoC 모델."""
    return os.getenv(
        "POC_HUB_MODEL",
        os.getenv(
            "STAR_CRAFT_HUB_MODEL",
            os.getenv("MONEYBALL_HUB_MODEL", get_ollama_model()),
        ),
    )
