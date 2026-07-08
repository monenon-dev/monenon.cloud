"""Compatibility entrypoint for running uvicorn from backend/apps."""

from __future__ import annotations

import importlib.util
from pathlib import Path
import sys

_BACKEND_MAIN_PATH = Path(__file__).resolve().parent.parent / "main.py"
_BACKEND_ROOT = str(_BACKEND_MAIN_PATH.parent)
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)
_SPEC = importlib.util.spec_from_file_location("_backend_main", _BACKEND_MAIN_PATH)
if _SPEC is None or _SPEC.loader is None:
    raise RuntimeError(f"Cannot load backend main module: {_BACKEND_MAIN_PATH}")
_MODULE = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(_MODULE)

app = _MODULE.app

