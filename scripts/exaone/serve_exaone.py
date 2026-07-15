#!/usr/bin/env python3
"""EXAONE AWQ 로컬 HTTP 서버 — Moneyball 허브/스포크 호출용.

한 GPU에서 hub(7.8B) / spoke(2.4B)를 요청마다 스왑 로드합니다.
6GB면 spoke를 기본으로 두고, hub는 필요할 때만 올리는 것을 권장합니다.

  source ~/.venvs/exaone/bin/activate
  export EXAONE_HUB_DIR=~/models/EXAONE-3.5-7.8B-Instruct-AWQ
  export EXAONE_SPOKE_DIR=~/models/EXAONE-3.5-2.4B-Instruct-AWQ
  export EXAONE_DEFAULT_ROLE=spoke
  python scripts/exaone/serve_exaone.py
  # → http://127.0.0.1:11435/chat
"""

from __future__ import annotations

import gc
import os
from pathlib import Path
from typing import Any, Literal

import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from transformers import AutoModelForCausalLM, AutoTokenizer

Role = Literal["hub", "spoke"]

HUB_DIR = Path(
    os.environ.get(
        "EXAONE_HUB_DIR",
        str(Path.home() / "models" / "EXAONE-3.5-7.8B-Instruct-AWQ"),
    )
).expanduser()
SPOKE_DIR = Path(
    os.environ.get(
        "EXAONE_SPOKE_DIR",
        str(Path.home() / "models" / "EXAONE-3.5-2.4B-Instruct-AWQ"),
    )
).expanduser()
DEFAULT_ROLE: Role = os.environ.get("EXAONE_DEFAULT_ROLE", "spoke").strip().lower()  # type: ignore[assignment]
HOST = os.environ.get("EXAONE_HOST", "0.0.0.0")
PORT = int(os.environ.get("EXAONE_PORT", "11435"))

app = FastAPI(title="EXAONE AWQ local", version="1.0.0")

_tokenizer: Any = None
_model: Any = None
_loaded_role: Role | None = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    role: Role = Field(default="spoke", description="hub=7.8B, spoke=2.4B")
    temperature: float = 0.1
    max_new_tokens: int = 256


class ChatResponse(BaseModel):
    content: str
    role: Role
    model_dir: str


def _dir_for(role: Role) -> Path:
    path = HUB_DIR if role == "hub" else SPOKE_DIR
    if not path.is_dir():
        raise HTTPException(status_code=500, detail=f"model dir missing: {path}")
    return path


def _unload() -> None:
    global _tokenizer, _model, _loaded_role
    _tokenizer = None
    _model = None
    _loaded_role = None
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()


def _ensure_loaded(role: Role) -> Path:
    global _tokenizer, _model, _loaded_role
    model_dir = _dir_for(role)
    if _loaded_role == role and _model is not None:
        return model_dir
    _unload()
    _tokenizer = AutoTokenizer.from_pretrained(str(model_dir), trust_remote_code=True)
    _model = AutoModelForCausalLM.from_pretrained(
        str(model_dir),
        torch_dtype=torch.float16,
        device_map="auto",
        trust_remote_code=True,
    )
    _loaded_role = role
    return model_dir


def _generate(messages: list[dict[str, str]], *, temperature: float, max_new_tokens: int) -> str:
    assert _tokenizer is not None and _model is not None
    if hasattr(_tokenizer, "apply_chat_template"):
        prompt = _tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
    else:
        prompt = messages[-1]["content"]
    inputs = _tokenizer(prompt, return_tensors="pt")
    if torch.cuda.is_available():
        inputs = {k: v.to(_model.device) for k, v in inputs.items()}
    gen_kwargs: dict[str, Any] = {
        "max_new_tokens": max_new_tokens,
        "do_sample": temperature > 0,
    }
    if temperature > 0:
        gen_kwargs["temperature"] = max(temperature, 1e-5)
    with torch.no_grad():
        out = _model.generate(**inputs, **gen_kwargs)
    return _tokenizer.decode(
        out[0][inputs["input_ids"].shape[-1] :], skip_special_tokens=True
    ).strip()


@app.on_event("startup")
def _startup() -> None:
    role: Role = DEFAULT_ROLE if DEFAULT_ROLE in ("hub", "spoke") else "spoke"
    try:
        path = _ensure_loaded(role)
        print(f"[exaone] preloaded role={role} dir={path}")
    except Exception as exc:
        print(f"[exaone] preload skipped: {exc}")


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "loaded_role": _loaded_role,
        "cuda": torch.cuda.is_available(),
        "hub_dir": str(HUB_DIR),
        "spoke_dir": str(SPOKE_DIR),
    }


@app.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest) -> ChatResponse:
    try:
        model_dir = _ensure_loaded(body.role)
        content = _generate(
            [m.model_dump() for m in body.messages],
            temperature=body.temperature,
            max_new_tokens=body.max_new_tokens,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return ChatResponse(content=content, role=body.role, model_dir=str(model_dir))


if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)
