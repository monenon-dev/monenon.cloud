"""관리자 도메인 — 플랫폼 개요 메타·ORM 맵."""

from admin.adapter.outbound.orm.admin_account import AdminAccount
from admin.adapter.outbound.orm.warning import Warning

ADMIN_TABLE_META: list[tuple[str, str, str, str, str]] = [
    ("admins", "관리자 계정", "admins", "관리자", "시스템 관리자 (/admin/login)"),
    ("warnings", "경고 기록", "warnings", "관리자", "관리자 → 회원 경고 이력"),
]

ADMIN_MODEL_MAP = {
    "admins": AdminAccount,
    "warnings": Warning,
}
