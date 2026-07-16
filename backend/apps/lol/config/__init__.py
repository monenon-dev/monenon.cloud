"""lol core — 환경변수 설정."""

from __future__ import annotations

import os


def get_neo4j_uri() -> str:
    return os.getenv("NEO4J_URI", "bolt://neo4j:7687")


def get_neo4j_user() -> str:
    return os.getenv("NEO4J_USER", "neo4j")


def get_neo4j_password() -> str:
    return os.getenv("NEO4J_PASSWORD", "monenon2026")


def get_ollama_base_url() -> str:
    return os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")


def get_ollama_model() -> str:
    """로컬 Hub LLM (PoC 기본: Qwen2.5-1.5B-Instruct)."""
    return os.getenv(
        "OLLAMA_MODEL",
        os.getenv("POC_HUB_MODEL", "qwen2.5:1.5b-instruct"),
    )


def get_poc_hub_model() -> str:
    """Gateway 입구 분류 + Moneyball hub/spoke 공통 PoC 모델."""
    return os.getenv(
        "POC_HUB_MODEL",
        os.getenv(
            "STAR_CRAFT_HUB_MODEL",
            os.getenv("MONEYBALL_HUB_MODEL", get_ollama_model()),
        ),
    )
