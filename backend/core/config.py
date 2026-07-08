"""환경 변수 — DATABASE_URL 등."""

from __future__ import annotations

import os

try:
    from core.matrix.vault_keymaker_secret_manager import get_keymaker

    get_keymaker().load_environment()
except ModuleNotFoundError:
    pass

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
