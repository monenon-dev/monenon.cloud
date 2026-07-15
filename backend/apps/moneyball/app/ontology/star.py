"""Moneyball 스타 온톨로지 — 허브 중심, 스포크는 DB 테이블 축."""

from __future__ import annotations

from typing import Literal

SpokeId = Literal["stadium", "team", "player", "schedule"]

SPOKE_IDS: tuple[SpokeId, ...] = ("stadium", "team", "player", "schedule")

# 스포크별 허용 테이블 (SELECT 가드)
SPOKE_TABLES: dict[SpokeId, frozenset[str]] = {
    # 홈구장 질의는 team.region_name 조인이 필요
    "stadium": frozenset({"moneyball_stadium", "moneyball_team"}),
    "team": frozenset({"moneyball_team", "moneyball_stadium"}),
    "player": frozenset({"moneyball_player", "moneyball_team"}),
    "schedule": frozenset(
        {"moneyball_schedule", "moneyball_team", "moneyball_stadium"}
    ),
}

SPOKE_SCHEMA: dict[SpokeId, str] = {
    "stadium": (
        "moneyball_stadium(stadium_id, stadium_name, hometeam_id, seat_count, "
        "address, ddd, tel)"
    ),
    "team": (
        "moneyball_team(team_id, region_name, team_name, e_team_name, orig_yyyy, "
        "address, homepage, owner, stadium_id) "
        "FK stadium_id→moneyball_stadium.stadium_id"
    ),
    "player": (
        "moneyball_player(player_id, player_name, e_player_name, nickname, "
        "join_yyyy, position, back_no, nation, birth_date, height, weight, team_id) "
        "FK team_id→moneyball_team.team_id"
    ),
    "schedule": (
        "moneyball_schedule(sche_date, stadium_id, gubun, hometeam_id, awayteam_id, "
        "home_score, away_score) "
        "FK stadium_id→moneyball_stadium; hometeam_id/awayteam_id→team_id"
    ),
}

HUB_ROUTE_PROMPT = """당신은 star_craft 허브(EXAONE)입니다. K리그 Moneyball 질문을 읽고 조회 스포크를 고르세요.
스포크: moneyball.stadium | moneyball.team | moneyball.player | moneyball.schedule
복합이면 spokes 배열에 여러 개를 넣으세요.

반드시 아래 JSON만 출력하세요. 설명 금지.
{{"spokes":[{{"id":"moneyball.team","subquery":"전북 홈구장"}}],"reason":"팀·경기장 조회"}}
"""

SPOKE_SQL_PROMPT = """당신은 K리그 Moneyball 스포크(EXAONE)입니다.
아래 스키마만 사용해 PostgreSQL SELECT 한 문장을 만드세요.
규칙:
- SELECT만 허용. INSERT/UPDATE/DELETE/DDL 금지
- 테이블은 moneyball_* 만
- LIMIT 30 이내
- 한글 팀/선수명은 ILIKE '%키워드%' 사용

스키마:
{schema}

하위 질의: {subquery}

반드시 아래 JSON만 출력하세요.
{{"sql":"SELECT ... LIMIT 30"}}
"""

HUB_SYNTH_PROMPT = """당신은 K리그 Moneyball 허브입니다.
아래는 DB에서 실제로 조회된 결과입니다. 이 결과만 근거로 한국어로 짧게 답하세요.
결과에 없으면 "DB에 해당 데이터가 없습니다"라고 말하세요. 추측 금지.

사용자 질문: {question}

조회 결과:
{evidence}
"""
