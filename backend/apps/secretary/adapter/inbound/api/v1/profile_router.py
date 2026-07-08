"""내 정보·아바타 API — /auth/me."""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from secretary.adapter.inbound.api.schemas.auth_response import UserProfileResponse
from secretary.app.composition.providers import get_user_use_case
from secretary.app.ports.input.user_use_case import UserUseCasePort

logger = logging.getLogger(__name__)

profile_router = APIRouter(prefix="/auth", tags=["user-profile"])

# main.py StaticFiles("/uploads")가 가리키는 backend/uploads와 경로를 맞춘다.
UPLOAD_ROOT = Path(__file__).resolve().parents[6] / "uploads" / "profiles"
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_AVATAR_BYTES = 2 * 1024 * 1024
EXT_BY_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


@profile_router.get("/me", response_model=UserProfileResponse)
async def auth_me(
    user_id: int,
    use_case: UserUseCasePort = Depends(get_user_use_case),
) -> UserProfileResponse:
    profile = await use_case.get_profile(user_id)
    if not profile:
        logger.warning("[ProfileRouter] get_profile 실패 — userId=%s", user_id)
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    logger.info("[ProfileRouter] get_profile 완료 — userId=%s", user_id)
    return profile


@profile_router.post("/me/avatar", response_model=UserProfileResponse)
async def auth_upload_avatar(
    user_id: int,
    file: UploadFile = File(...),
    use_case: UserUseCasePort = Depends(get_user_use_case),
) -> UserProfileResponse:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="JPEG, PNG, WebP, GIF 이미지만 업로드할 수 있습니다.",
        )
    data = await file.read()
    if len(data) > MAX_AVATAR_BYTES:
        raise HTTPException(status_code=400, detail="이미지는 2MB 이하여야 합니다.")
    if not data:
        raise HTTPException(status_code=400, detail="빈 파일입니다.")

    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    ext = EXT_BY_TYPE.get(file.content_type or "", ".jpg")
    filename = f"{user_id}_{int(datetime.now().timestamp())}{ext}"
    dest = UPLOAD_ROOT / filename
    dest.write_bytes(data)

    url_path = f"/uploads/profiles/{filename}"
    profile = await use_case.update_profile_image(user_id, url_path)
    if not profile:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    logger.info("[ProfileRouter] upload_avatar 완료 — userId=%s", user_id)
    return profile
