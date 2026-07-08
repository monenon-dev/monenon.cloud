from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from titanic.adapter.inbound.api.schemas.crew_walter_roaster_schema import WalterRoasterSchema
from titanic.app.dto.crew_walter_roaster_dto import WalterRoasterResponse
from titanic.app.ports.input.crew_walter_roaster_use_case import WalterRoasterUseCase
from titanic.app.dependencies.crew_walter_roaster_provider import get_walter_roaster_use_case

walter_roaster_router = APIRouter(prefix="/titanic/walter", tags=["walter"])


def _to_number(value: Any) -> int | float | None:
    if value is None or value == "":
        return None
    try:
        text = str(value).strip()
        return int(text) if "." not in text else float(text)
    except (TypeError, ValueError):
        return None


def _to_frontend_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "PassengerId": _to_number(row.get("passenger_id")),
        "Survived": _to_number(row.get("survived")),
        "Pclass": _to_number(row.get("pclass")),
        "Name": row.get("name"),
        "gender": row.get("gender"),
        "Age": _to_number(row.get("age")),
        "SibSp": _to_number(row.get("sib_sp")),
        "Parch": _to_number(row.get("parch")),
        "Ticket": row.get("ticket"),
        "Fare": _to_number(row.get("fare")),
        "Cabin": row.get("cabin"),
        "Embarked": row.get("embarked"),
    }


@walter_roaster_router.get("/myself")
async def introduce_myself(
    walter: WalterRoasterUseCase = Depends(get_walter_roaster_use_case),
) -> WalterRoasterResponse:
    return await walter.introduce_myself(
        WalterRoasterSchema(
            id=2,
            name="Walter Nichols",
        )
    )


@walter_roaster_router.get("/passengers")
async def list_passengers(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    skip: int | None = Query(None, ge=0),
    limit: int | None = Query(None, ge=1, le=200),
    walter: WalterRoasterUseCase = Depends(get_walter_roaster_use_case),
) -> dict:
    if skip is not None or limit is not None:
        resolved_skip = skip or 0
        resolved_limit = limit or 50
        resolved_page = (resolved_skip // resolved_limit) + 1 if resolved_limit else 1
    else:
        resolved_page = page
        resolved_limit = page_size
        resolved_skip = (page - 1) * page_size

    items = await walter.list_passengers(skip=resolved_skip, limit=resolved_limit)
    total = await walter.get_count()
    total_pages = max(1, (total + resolved_limit - 1) // resolved_limit)
    return {
        "items": [_to_frontend_row(item) for item in items],
        "page": resolved_page,
        "page_size": resolved_limit,
        "total": total,
        "total_pages": total_pages,
    }


@walter_roaster_router.get("/count")
async def passenger_count(
    walter: WalterRoasterUseCase = Depends(get_walter_roaster_use_case),
) -> dict:
    return {"count": await walter.get_count()}
