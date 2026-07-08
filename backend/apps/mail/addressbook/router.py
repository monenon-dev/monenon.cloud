"""주소록 — CSV 업로드 + 목록 조회."""

from __future__ import annotations

import csv
import io
import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.matrix.grid_oracle_database_manager import get_db
from mail.addressbook.models import Contact

logger = logging.getLogger(__name__)

addressbook_router = APIRouter(prefix="/addressbook", tags=["addressbook"])


def _parse_google_csv(content: str) -> list[dict]:
    """Google Contacts CSV 파싱 → [{name, email, phone}]."""
    reader = csv.DictReader(io.StringIO(content))
    contacts = []
    for row in reader:
        # Google CSV 컬럼명 처리
        name = (
            row.get("Name") or
            row.get("이름") or
            f"{row.get('Given Name', '')} {row.get('Family Name', '')}".strip() or
            "이름 없음"
        )
        # 이메일 1~3 컬럼 시도
        email = (
            row.get("E-mail 1 - Value") or
            row.get("Email 1 - Value") or
            row.get("이메일 1 - 값") or
            row.get("email") or
            row.get("Email") or
            ""
        ).strip()
        if not email:
            continue
        phone = (
            row.get("Phone 1 - Value") or
            row.get("전화 1 - 값") or
            ""
        ).strip() or None
        contacts.append({"name": name.strip(), "email": email.lower(), "phone": phone})
    return contacts


@addressbook_router.post("/upload", status_code=201)
async def upload_contacts(
    user_id: int = Query(...),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Google Contacts CSV 업로드 → DB 저장."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="CSV 파일만 업로드 가능합니다.")

    raw = await file.read()
    try:
        content = raw.decode("utf-8-sig")  # BOM 제거
    except UnicodeDecodeError:
        content = raw.decode("cp949", errors="ignore")

    parsed = _parse_google_csv(content)
    if not parsed:
        raise HTTPException(status_code=400, detail="파싱된 연락처가 없습니다. Google CSV 형식인지 확인하세요.")

    # 기존 연락처 이메일 목록 (중복 방지)
    existing = await session.execute(
        select(Contact.email).where(Contact.user_id == user_id)
    )
    existing_emails = {r[0] for r in existing.fetchall()}

    added = 0
    for c in parsed:
        if c["email"] in existing_emails:
            continue
        session.add(Contact(
            user_id=user_id,
            name=c["name"],
            email=c["email"],
            phone=c["phone"],
        ))
        existing_emails.add(c["email"])
        added += 1

    await session.flush()
    logger.info("[addressbook] 업로드 완료: user_id=%s added=%s", user_id, added)
    return {"ok": True, "total_parsed": len(parsed), "added": added}


@addressbook_router.get("/contacts")
async def list_contacts(
    user_id: int = Query(...),
    q: str = Query(default="", description="이름·이메일 검색"),
    session: AsyncSession = Depends(get_db),
) -> list[dict]:
    """주소록 목록 조회."""
    stmt = select(Contact).where(Contact.user_id == user_id)
    if q.strip():
        like = f"%{q.strip()}%"
        from sqlalchemy import or_
        stmt = stmt.where(
            or_(Contact.name.ilike(like), Contact.email.ilike(like))
        )
    stmt = stmt.order_by(Contact.name.asc())
    result = await session.execute(stmt)
    return [
        {"id": r.id, "name": r.name, "email": r.email, "phone": r.phone}
        for r in result.scalars().all()
    ]


@addressbook_router.delete("/contacts/{contact_id}")
async def delete_contact(
    contact_id: int,
    user_id: int = Query(...),
    session: AsyncSession = Depends(get_db),
) -> dict:
    result = await session.execute(
        select(Contact).where(Contact.id == contact_id, Contact.user_id == user_id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="연락처를 찾을 수 없습니다.")
    await session.delete(row)
    return {"ok": True, "deleted_id": contact_id}
