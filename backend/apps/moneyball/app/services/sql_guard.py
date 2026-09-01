"""SELECT-only SQL 가드 — moneyball_* 테이블만 허용."""

from __future__ import annotations

import re

_FORBIDDEN = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|GRANT|REVOKE|"
    r"COPY|EXECUTE|CALL|MERGE|REPLACE|ATTACH|DETACH)\b",
    re.IGNORECASE,
)
_TABLE = re.compile(r"\b(FROM|JOIN)\s+([a-zA-Z_][\w]*)", re.IGNORECASE)


class UnsafeSqlError(ValueError):
    pass


def validate_select_sql(sql: str, *, allowed_tables: frozenset[str]) -> str:
    cleaned = sql.strip().rstrip(";").strip()
    if not cleaned:
        raise UnsafeSqlError("SQL이 비어 있습니다.")
    if ";" in cleaned:
        raise UnsafeSqlError("세미콜론으로 여러 문장을 쓸 수 없습니다.")
    if not cleaned.upper().startswith("SELECT"):
        raise UnsafeSqlError("SELECT 문만 허용됩니다.")
    if _FORBIDDEN.search(cleaned):
        raise UnsafeSqlError("허용되지 않는 SQL 키워드가 있습니다.")
    tables = {m.group(2).lower() for m in _TABLE.finditer(cleaned)}
    if not tables:
        raise UnsafeSqlError("FROM/JOIN 테이블을 찾을 수 없습니다.")
    unknown = tables - {t.lower() for t in allowed_tables}
    if unknown:
        raise UnsafeSqlError(f"허용되지 않은 테이블: {', '.join(sorted(unknown))}")
    return cleaned
