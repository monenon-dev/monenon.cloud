#!/usr/bin/env python3
"""EXAONE AWQ 로컬 HTTP 서버 — Moneyball 허브/스포크 호출용.

기본은 spoke(2.4B)만 사용합니다. cuda 없이 hub(7.8B) 스왑하면
디스크 오프로드 + generate 500이 납니다.

  source ~/.venvs/exaone/bin/activate
  export EXAONE_SPOKE_DIR=~/models/EXAONE-3.5-2.4B-Instruct-AWQ
  export EXAONE_FORCE_SPOKE=1
  python scripts/exaone/serve_exaone.py
"""

from __future__ import annotations

import gc
import os
import traceback
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
# 기본 ON: hub/spoke 요청을 모두 2.4B로 처리 (GPU 준비 전 안정화)
FORCE_SPOKE = os.environ.get("EXAONE_FORCE_SPOKE", "1").strip().lower() in {
    "1",
    "true",
    "yes",
}
HOST = os.environ.get("EXAONE_HOST", "0.0.0.0")
PORT = int(os.environ.get("EXAONE_PORT", "11435"))

app = FastAPI(title="EXAONE AWQ local", version="1.1.0")

_tokenizer: Any = None
_model: Any = None
_loaded_role: Role | None = None
_last_error: str | None = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    role: Role = Field(default="spoke", description="hub=7.8B, spoke=2.4B")
    temperature: float = 0.0
    max_new_tokens: int = 256


class ChatResponse(BaseModel):
    content: str
    role: Role
    model_dir: str


def _resolve_role(requested: Role) -> Role:
    if FORCE_SPOKE:
        return "spoke"
    return requested


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


def _model_device() -> torch.device:
    assert _model is not None
    try:
        return next(_model.parameters()).device
    except StopIteration:
        return torch.device("cpu")


def _ensure_loaded(role: Role) -> Path:
    global _tokenizer, _model, _loaded_role
    role = _resolve_role(role)
    model_dir = _dir_for(role)
    if _loaded_role == role and _model is not None:
        return model_dir
    _unload()

    dtype = torch.float16 if torch.cuda.is_available() else torch.float32
    load_kwargs: dict[str, Any] = {
        "trust_remote_code": True,
        "torch_dtype": dtype,
        "low_cpu_mem_usage": True,
    }
    if torch.cuda.is_available():
        load_kwargs["device_map"] = "auto"
    else:
        # CPU-only: disk offload 금지 (generate 불안정·500 원인)
        load_kwargs["device_map"] = None

    _tokenizer = AutoTokenizer.from_pretrained(str(model_dir), trust_remote_code=True)
    _model = AutoModelForCausalLM.from_pretrained(str(model_dir), **load_kwargs)
    if not torch.cuda.is_available():
        _model = _model.to("cpu")
    _model.eval()
    if _tokenizer.pad_token_id is None and _tokenizer.eos_token_id is not None:
        _tokenizer.pad_token = _tokenizer.eos_token
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

    device = _model_device()
    inputs = _tokenizer(prompt, return_tensors="pt")
    inputs = {k: v.to(device) for k, v in inputs.items()}

    # EXAONE remote code + 최신 transformers: sampling/cache_position 충돌 줄이기
    gen_kwargs: dict[str, Any] = {
        "max_new_tokens": max_new_tokens,
        "do_sample": False,
        "use_cache": True,
        "pad_token_id": _tokenizer.pad_token_id,
        "eos_token_id": _tokenizer.eos_token_id,
    }
    with torch.inference_mode():
        try:
            out = _model.generate(**inputs, **gen_kwargs)
        except TypeError as exc:
            # cache_position 등 시그니처 불일치 시 최소 인자만
            if "cache_position" in str(exc) or "unexpected" in str(exc).lower():
                out = _model.generate(
                    inputs["input_ids"],
                    attention_mask=inputs.get("attention_mask"),
                    max_new_tokens=max_new_tokens,
                    do_sample=False,
                    pad_token_id=_tokenizer.pad_token_id,
                )
            else:
                raise
    return _tokenizer.decode(
        out[0][inputs["input_ids"].shape[-1] :], skip_special_tokens=True
    ).strip()


@app.on_event("startup")
def _startup() -> None:
    global _last_error
    role: Role = DEFAULT_ROLE if DEFAULT_ROLE in ("hub", "spoke") else "spoke"
    role = _resolve_role(role)
    print(f"[exaone] cuda={torch.cuda.is_available()} force_spoke={FORCE_SPOKE}")
    try:
        path = _ensure_loaded(role)
        print(f"[exaone] preloaded role={role} dir={path} device={_model_device()}")
    except Exception as exc:
        _last_error = traceback.format_exc()
        print(f"[exaone] preload skipped: {exc}")


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "loaded_role": _loaded_role,
        "cuda": torch.cuda.is_available(),
        "force_spoke": FORCE_SPOKE,
        "hub_dir": str(HUB_DIR),
        "spoke_dir": str(SPOKE_DIR),
        "last_error": _last_error,
    }


@app.post("/chat", response_model=ChatResponse)
def chat(body: ChatRequest) -> ChatResponse:
    global _last_error
    role = _resolve_role(body.role)
    try:
        model_dir = _ensure_loaded(role)
        content = _generate(
            [m.model_dump() for m in body.messages],
            temperature=body.temperature,
            max_new_tokens=min(body.max_new_tokens, 256),
        )
        _last_error = None
    except HTTPException:
        raise
    except Exception as exc:
        _last_error = traceback.format_exc()
        print(_last_error)
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    return ChatResponse(content=content or "(empty)", role=role, model_dir=str(model_dir))


if __name__ == "__main__":
    uvicorn.run(app, host=HOST, port=PORT)
