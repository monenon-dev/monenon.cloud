"""sql_guard 단위 테스트."""

from __future__ import annotations

import pytest

from moneyball.app.services.sql_guard import UnsafeSqlError, validate_select_sql

ALLOWED = frozenset({"moneyball_player", "moneyball_team"})


def test_accepts_select_join() -> None:
    sql = validate_select_sql(
        "SELECT p.player_name FROM moneyball_player p "
        "JOIN moneyball_team t ON t.team_id = p.team_id LIMIT 10",
        allowed_tables=ALLOWED,
    )
    assert sql.upper().startswith("SELECT")


def test_rejects_delete() -> None:
    with pytest.raises(UnsafeSqlError):
        validate_select_sql("DELETE FROM moneyball_player", allowed_tables=ALLOWED)


def test_rejects_unknown_table() -> None:
    with pytest.raises(UnsafeSqlError):
        validate_select_sql(
            "SELECT * FROM users LIMIT 1",
            allowed_tables=ALLOWED,
        )
