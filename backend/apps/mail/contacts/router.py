"""Google People API — 주소록 검색 (자동완성용)."""

from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, HTTPException, Query

logger = logging.getLogger(__name__)

contacts_router = APIRouter(prefix="/contacts", tags=["contacts"])

_PEOPLE_API = "https://people.googleapis.com/v1/people:searchContacts"


@contacts_router.get("/search")
async def search_contacts(
    q: str = Query(..., min_length=1, description="검색할 이름 또는 이메일"),
    token: str = Query(..., description="Google OAuth access_token"),
) -> list[dict]:
    """
    Google 주소록에서 이름/이메일 검색 → [{name, email}] 반환.
    프론트엔드 자동완성용.
    """
    if not q.strip():
        return []

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(
                _PEOPLE_API,
                params={
                    "query": q.strip(),
                    "readMask": "names,emailAddresses",
                    "pageSize": 10,
                },
                headers={"Authorization": f"Bearer {token}"},
            )

        if res.status_code == 401:
            raise HTTPException(status_code=401, detail="Google 토큰이 만료됐습니다. 다시 로그인하세요.")
        if res.status_code == 403:
            raise HTTPException(status_code=403, detail="주소록 접근 권한이 없습니다. Google 계정에서 권한을 허용해 주세요.")
        if not res.is_success:
            raise HTTPException(status_code=502, detail=f"Google API 오류: {res.status_code}")

        data = res.json()
        results = []
        for person in data.get("results", []):
            p = person.get("person", {})
            names = p.get("names", [])
            emails = p.get("emailAddresses", [])
            if not emails:
                continue
            name = names[0].get("displayName", "") if names else ""
            for email_obj in emails:
                email = email_obj.get("value", "")
                if email:
                    results.append({"name": name, "email": email})
        return results

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("[contacts/search] 오류: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))
