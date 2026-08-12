"""환경 변수 — DATABASE_URL 등."""

from __future__ import annotations

import os

try:
    from core.matrix.vault_keymaker_secret_manager import get_keymaker

    get_keymaker().load_environment()
except ModuleNotFoundError:
    pass


def _database_url_from_env() -> str:
    for key in (
        "DATABASE_URL",
        "POSTGRES_URL",
        "DATABASE_PRIVATE_URL",
        "NEON_DATABASE_URL",
    ):
        val = (os.getenv(key) or "").strip()
        if val:
            return val
    return ""


DATABASE_URL = _database_url_from_env()
