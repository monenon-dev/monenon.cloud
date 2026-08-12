"""주간 업무 리포트 API."""

from __future__ import annotations

import logging

from fastapi import Depends
from fastapi.responses import JSONResponse
from fastapi.routing import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from gemini_caller import GeminiQuotaError
from orchestration.adapter.inbound.api.schemas.weekly_report_schema import (
    WeeklyReportRequest,
    WeeklyReportResponse,
)
from orchestration.adapter.outbound.pg.orchestration_pg_repository import OrchestrationPgRepository
from orchestration.app.composition.providers import get_orchestration_pg_repository
from orchestration.app.use_cases.run_weekly_report import run_weekly_report

logger = logging.getLogger(__name__)

weekly_report_router = APIRouter(prefix="/orchestration", tags=["orchestration"])


@weekly_report_router.post("/report/weekly", response_model=WeeklyReportResponse)
async def create_weekly_report(
    body: WeeklyReportRequest,
    session: AsyncSession = Depends(get_db),
    repo: OrchestrationPgRepository = Depends(get_orchestration_pg_repository),
) -> WeeklyReportResponse | JSONResponse:
    await repo.verify_user(body.user_id)
    try:
        result = await run_weekly_report(
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
        logger.exception("[weekly_report] failed user_id=%s: %s", body.user_id, exc)
        return JSONResponse({"detail": "주간 리포트 생성에 실패했습니다."}, status_code=502)

    logger.info(
        "[weekly_report] ok user_id=%s risks=%s actions=%s tool_logs=%s",
        body.user_id,
        len(result.get("risks") or []),
        len(result.get("next_actions") or []),
        len(result.get("tool_logs") or []),
    )
    return WeeklyReportResponse(**result)
