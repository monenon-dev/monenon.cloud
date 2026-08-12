"""LangGraph 멀티에이전트 브리핑 API."""

from __future__ import annotations

import logging

from fastapi import Depends, Query
from fastapi.responses import JSONResponse
from fastapi.routing import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from gemini_caller import GeminiQuotaError
from orchestration.adapter.inbound.api.schemas.briefing_schema import (
    BriefingRequest,
    BriefingResponse,
    TodayBriefingResponse,
)
from orchestration.adapter.outbound.pg.orchestration_pg_repository import OrchestrationPgRepository
from orchestration.app.composition.providers import get_orchestration_pg_repository
from orchestration.app.use_cases.get_or_create_today_briefing import get_or_create_today_briefing
from orchestration.app.use_cases.run_briefing import run_briefing

logger = logging.getLogger(__name__)

briefing_router = APIRouter(prefix="/orchestration", tags=["orchestration"])


@briefing_router.post("/briefing", response_model=BriefingResponse)
async def create_briefing(
    body: BriefingRequest,
    session: AsyncSession = Depends(get_db),
) -> BriefingResponse | JSONResponse:
    try:
        result = await run_briefing(
            query=body.query,
            session=session,
            user_id=body.user_id,
            speech_tone=body.speech_tone,
            user_type=body.user_type,
            industry=body.industry,
        )
    except ValueError as exc:
        return JSONResponse({"detail": str(exc)}, status_code=400)
    except GeminiQuotaError as exc:
        return JSONResponse({"detail": str(exc)}, status_code=429)
    except RuntimeError as exc:
        return JSONResponse({"detail": str(exc)}, status_code=503)
    except Exception as exc:
        logger.exception("[briefing] failed: %s", exc)
        return JSONResponse({"detail": "브리핑 생성에 실패했습니다."}, status_code=502)

    logger.info(
        "[briefing] ok user_id=%s trace_steps=%s tool_logs=%s",
        body.user_id,
        len(result.get("trace") or []),
        len(result.get("tool_logs") or []),
    )
    return BriefingResponse(**result)


@briefing_router.get("/briefing/today", response_model=TodayBriefingResponse)
async def orchestration_briefing_today(
    user_id: int = Query(..., ge=1),
    speech_tone: str | None = Query(default=None),
    user_type: str | None = Query(default=None),
    industry: str | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
    repo: OrchestrationPgRepository = Depends(get_orchestration_pg_repository),
) -> TodayBriefingResponse | JSONResponse:
    await repo.verify_user(user_id)
    try:
        payload = await get_or_create_today_briefing(
            session,
            user_id=user_id,
            speech_tone=speech_tone,
            user_type=user_type,
            industry=industry,
        )
    except GeminiQuotaError as exc:
        return JSONResponse({"detail": str(exc)}, status_code=429)
    except RuntimeError as exc:
        return JSONResponse({"detail": str(exc)}, status_code=503)
    except Exception as exc:
        logger.exception("[briefing_today] failed user_id=%s: %s", user_id, exc)
        return JSONResponse({"detail": "오늘의 브리핑을 불러오지 못했습니다."}, status_code=502)
    return TodayBriefingResponse(**payload)
