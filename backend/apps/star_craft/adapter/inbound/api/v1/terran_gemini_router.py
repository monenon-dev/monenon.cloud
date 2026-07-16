"""star_craft 테란 Vessel — Gemini 직접 호출 API."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from star_craft.app.use_cases.terran_vessel_gemini_interactor import terran_vessel_gemini

terran_router = APIRouter(prefix="/terran", tags=["star-craft-terran"])


class TerranGeminiRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=4000)
    system_hint: str | None = Field(default=None, max_length=1000)


class TerranGeminiResponse(BaseModel):
    ok: bool
    reply: str
    model: str
    handler: str = "gemini"
    detail: str | None = None


@terran_router.post("/vessel/gemini", response_model=TerranGeminiResponse)
async def terran_vessel_gemini_chat(body: TerranGeminiRequest) -> TerranGeminiResponse | JSONResponse:
    """
    Gateway gemini 인텐트용 — GEMINI_API_KEY로 답변 생성.
    RAG/CRUD와 역할 분리.
    """
    result = terran_vessel_gemini.answer(body.query, system_hint=body.system_hint)
    payload = TerranGeminiResponse(
        ok=result.ok,
        reply=result.reply,
        model=result.model,
        handler=result.handler,
        detail=result.detail,
    )
    if not result.ok:
        status = 429 if result.detail and "한도" in (result.detail or "") else 502
        if result.detail and "비어" in result.detail:
            status = 400
        return JSONResponse(payload.model_dump(), status_code=status)
    return payload
