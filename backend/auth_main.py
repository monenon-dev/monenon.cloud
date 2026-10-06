"""Monenon Auth 게이트웨이 — JWT 발급 전용 엔트리."""

from __future__ import annotations

import logging
import os
from pathlib import Path
import sys

# backend 루트 + apps 를 path에 추가 (로컬·Docker 공통)
_BACKEND_ROOT = Path(__file__).resolve().parent
_APPS = _BACKEND_ROOT / "apps"
for p in (_BACKEND_ROOT, _APPS):
    s = str(p)
    if s not in sys.path:
        sys.path.insert(0, s)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)

try:
    from core.matrix.vault_keymaker_secret_manager import get_keymaker

    get_keymaker().load_environment()
except Exception:
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from auth.router import router as auth_router

app = FastAPI(
    title="Monenon Auth",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

_origins = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,https://choseohee.com,https://www.choseohee.com",
    ).split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=r"https://(.*\.)?choseohee\.com|https://[a-z0-9-]+\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth")


@app.get("/healthz")
async def healthz() -> dict:
    return {"ok": True}
