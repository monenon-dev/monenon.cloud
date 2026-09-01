"""역할·권한 매핑 (auth 발급 클레임용)."""

from __future__ import annotations

from enum import StrEnum


class Role(StrEnum):
    USER = "user"
    ADMIN = "admin"


class Permission(StrEnum):
    READ_OWN = "read:own"
    WRITE_OWN = "write:own"
    ADMIN_USERS = "admin:users"
    ADMIN_ALL = "admin:all"


ROLE_PERMISSIONS: dict[Role, frozenset[Permission]] = {
    Role.USER: frozenset({Permission.READ_OWN, Permission.WRITE_OWN}),
    Role.ADMIN: frozenset(
        {
            Permission.READ_OWN,
            Permission.WRITE_OWN,
            Permission.ADMIN_USERS,
            Permission.ADMIN_ALL,
        }
    ),
}


def permissions_for_roles(roles: list[str]) -> list[str]:
    out: set[str] = set()
    for r in roles:
        try:
            role = Role(r)
        except ValueError:
            continue
        out.update(p.value for p in ROLE_PERMISSIONS.get(role, frozenset()))
    return sorted(out)
