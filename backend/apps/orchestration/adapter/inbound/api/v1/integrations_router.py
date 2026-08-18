"""Slack · Gmail 연동 OAuth 및 토글 API."""

from __future__ import annotations

import logging

from fastapi import Depends, HTTPException
from fastapi.responses import JSONResponse
from fastapi.routing import APIRouter
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from core.dependencies import get_authenticated_user_id
from orchestration.adapter.inbound.api.schemas.integration_schema import (
    ConnectIntegrationBody,
    IntegrationStatusOut,
    IntegrationsListResponse,
    PatchBriefingNotifyBody,
    PatchIntegrationBody,
)
from orchestration.adapter.outbound.pg.integration_pg_repository import IntegrationPgRepository
from orchestration.adapter.outbound.pg.orchestration_pg_repository import OrchestrationPgRepository
from orchestration.app.composition.providers import (
    get_integration_pg_repository,
    get_orchestration_pg_repository,
)
from orchestration.app.integrations.gmail_oauth import exchange_gmail_code
from orchestration.app.integrations.slack_oauth import exchange_slack_code

logger = logging.getLogger(__name__)

integrations_router = APIRouter(prefix="/orchestration", tags=["orchestration"])


def _status_from_row(provider: str, row) -> IntegrationStatusOut:
    connected = bool(row and (row.access_token or "").strip() and row.enabled)
    meta = row.metadata_json if row and isinstance(row.metadata_json, dict) else {}
    return IntegrationStatusOut(
        provider=provider,
        connected=connected,
        enabled=bool(row.enabled) if row else False,
        connected_at=row.connected_at if row else None,
        briefing_notify=bool(meta.get("briefing_notify")) if connected else False,
    )


@integrations_router.get("/integrations", response_model=IntegrationsListResponse)
async def list_integrations(
    auth_user_id: int = Depends(get_authenticated_user_id),
    repo: OrchestrationPgRepository = Depends(get_orchestration_pg_repository),
    integ_repo: IntegrationPgRepository = Depends(get_integration_pg_repository),
) -> IntegrationsListResponse:
    user_id = auth_user_id
    await repo.verify_user(user_id)
    rows = {r.provider: r for r in await integ_repo.list_for_user(user_id)}
    integrations = [
        _status_from_row("slack", rows.get("slack")),
        _status_from_row("gmail", rows.get("gmail")),
    ]
    briefing_notify = any(i.briefing_notify for i in integrations)
    return IntegrationsListResponse(
        user_id=user_id,
        integrations=integrations,
        briefing_notify=briefing_notify,
    )


@integrations_router.patch("/integrations", response_model=IntegrationStatusOut)
async def patch_integration(
    body: PatchIntegrationBody,
    auth_user_id: int = Depends(get_authenticated_user_id),
    session: AsyncSession = Depends(get_db),
    repo: OrchestrationPgRepository = Depends(get_orchestration_pg_repository),
    integ_repo: IntegrationPgRepository = Depends(get_integration_pg_repository),
) -> IntegrationStatusOut | JSONResponse:
    user_id = auth_user_id
    await repo.verify_user(user_id)
    provider = body.provider.strip().lower()
    if provider not in ("slack", "gmail"):
        return JSONResponse({"detail": "지원하지 않는 provider입니다."}, status_code=400)

    if not body.enabled:
        row = await integ_repo.disconnect(user_id, provider)
    else:
        row = await integ_repo.get(user_id, provider)
        if row is None or not (row.access_token or "").strip():
            return JSONResponse(
                {"detail": "OAuth 연결 후에 다시 켤 수 있습니다."},
                status_code=400,
            )
        row = await integ_repo.set_enabled(user_id, provider, enabled=True)

    await session.commit()
    return _status_from_row(provider, row)


@integrations_router.post("/integrations/slack", response_model=IntegrationStatusOut)
async def connect_slack(
    body: ConnectIntegrationBody,
    auth_user_id: int = Depends(get_authenticated_user_id),
    session: AsyncSession = Depends(get_db),
    repo: OrchestrationPgRepository = Depends(get_orchestration_pg_repository),
    integ_repo: IntegrationPgRepository = Depends(get_integration_pg_repository),
) -> IntegrationStatusOut | JSONResponse:
    user_id = auth_user_id
    await repo.verify_user(user_id)
    try:
        tokens = await exchange_slack_code(body.code, body.redirect_uri)
        row = await integ_repo.upsert_tokens(
            user_id=user_id,
            provider="slack",
            access_token=tokens["access_token"],
            metadata=tokens.get("metadata"),
        )
        await session.commit()
    except ValueError as exc:
        return JSONResponse({"detail": str(exc)}, status_code=400)
    except RuntimeError as exc:
        return JSONResponse({"detail": str(exc)}, status_code=503)
    except Exception as exc:
        logger.exception("[connect_slack] failed: %s", exc)
        return JSONResponse({"detail": "Slack 연동에 실패했습니다."}, status_code=502)

    logger.info("[connect_slack] ok user_id=%s", user_id)
    return _status_from_row("slack", row)


@integrations_router.post("/integrations/gmail", response_model=IntegrationStatusOut)
async def connect_gmail(
    body: ConnectIntegrationBody,
    auth_user_id: int = Depends(get_authenticated_user_id),
    session: AsyncSession = Depends(get_db),
    repo: OrchestrationPgRepository = Depends(get_orchestration_pg_repository),
    integ_repo: IntegrationPgRepository = Depends(get_integration_pg_repository),
) -> IntegrationStatusOut | JSONResponse:
    user_id = auth_user_id
    await repo.verify_user(user_id)
    try:
        tokens = await exchange_gmail_code(body.code, body.redirect_uri)
        row = await integ_repo.upsert_tokens(
            user_id=user_id,
            provider="gmail",
            access_token=tokens["access_token"],
            refresh_token=tokens.get("refresh_token"),
            expires_at=tokens.get("expires_at"),
            metadata=tokens.get("metadata"),
        )
        await session.commit()
    except ValueError as exc:
        return JSONResponse({"detail": str(exc)}, status_code=400)
    except RuntimeError as exc:
        return JSONResponse({"detail": str(exc)}, status_code=503)
    except Exception as exc:
        logger.exception("[connect_gmail] failed: %s", exc)
        return JSONResponse({"detail": "Gmail 연동에 실패했습니다."}, status_code=502)

    logger.info("[connect_gmail] ok user_id=%s", user_id)
    return _status_from_row("gmail", row)


@integrations_router.patch("/integrations/briefing-notify", response_model=IntegrationsListResponse)
async def patch_briefing_notify(
    body: PatchBriefingNotifyBody,
    auth_user_id: int = Depends(get_authenticated_user_id),
    session: AsyncSession = Depends(get_db),
    repo: OrchestrationPgRepository = Depends(get_orchestration_pg_repository),
    integ_repo: IntegrationPgRepository = Depends(get_integration_pg_repository),
) -> IntegrationsListResponse | JSONResponse:
    user_id = auth_user_id
    await repo.verify_user(user_id)
    rows = await integ_repo.list_for_user(user_id)
    connected = [
        r
        for r in rows
        if (r.access_token or "").strip() and r.enabled and r.provider == "gmail"
    ]
    if body.enabled and not connected:
        return JSONResponse(
            {"detail": "Gmail 연동 후 알림을 켤 수 있습니다."},
            status_code=400,
        )
    await integ_repo.set_briefing_notify(user_id, enabled=body.enabled)
    await session.commit()
    rows_map = {r.provider: r for r in await integ_repo.list_for_user(user_id)}
    integrations = [
        _status_from_row("slack", rows_map.get("slack")),
        _status_from_row("gmail", rows_map.get("gmail")),
    ]
    briefing_notify = any(i.briefing_notify for i in integrations)
    return IntegrationsListResponse(
        user_id=user_id,
        integrations=integrations,
        briefing_notify=briefing_notify,
    )
