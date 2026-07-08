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
    """EXAONE 모델명 — Ollama에 pull된 이름."""
    return os.getenv("OLLAMA_MODEL", "exaone3.5:2.4b")
