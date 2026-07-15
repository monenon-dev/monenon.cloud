"""LLM 없을 때·실패 시 키워드 기반 라우팅·SQL·답변."""

from __future__ import annotations

import re
from typing import Any

from moneyball.app.ontology.star import SPOKE_IDS, SpokeId

_TEAM_HINTS = (
    "전북",
    "울산",
    "서울",
    "수원",
    "포항",
    "제주",
    "인천",
    "대구",
    "광주",
    "대전",
    "김천",
    "강원",
    "성남",
    "부천",
    "안양",
    "FC",
    "유나이티드",
)


def _pick_keyword(message: str) -> str | None:
    for hint in _TEAM_HINTS:
        if hint in message:
            return hint
    m = re.search(r"[가-힣A-Za-z]{2,20}", message)
    return m.group(0) if m else None


def heuristic_route(message: str) -> list[dict[str, str]]:
    text = message.strip()
    lower = text.lower()
    spokes: list[SpokeId] = []

    if any(k in text for k in ("경기장", "스타디움", "홈구장", "좌석", "구장")):
        spokes.append("stadium")
    if any(k in text for k in ("선수", "포지션", "백넘버", "국적", "FW", "MF", "DF", "GK")):
        spokes.append("player")
    if any(k in text for k in ("일정", "경기", "스코어", "홈팀", "원정", "승부", "일정표")):
        spokes.append("schedule")
    if any(k in text for k in ("팀", "구단", "연고", "홈페이지")) or "team" in lower:
        spokes.append("team")

    if not spokes:
        # 기본: 팀명 언급이면 team, 아니면 team+player 힌트
        if _pick_keyword(text):
            spokes = ["team", "player"]
        else:
            spokes = ["team"]

    # 순서 고정: stadium → team → player → schedule
    order = {s: i for i, s in enumerate(SPOKE_IDS)}
    unique = sorted(dict.fromkeys(spokes), key=lambda s: order[s])
    return [{"id": s, "subquery": text} for s in unique]


def heuristic_sql(spoke: SpokeId, subquery: str) -> str:
    kw = (_pick_keyword(subquery) or "").replace("'", "''")
    like = f"%{kw}%" if kw else "%"

    if spoke == "stadium":
        return (
            "SELECT stadium_id, stadium_name, hometeam_id, seat_count, address "
            "FROM moneyball_stadium "
            f"WHERE stadium_name ILIKE '{like}' OR hometeam_id ILIKE '{like}' "
            "OR address ILIKE '{like}' "
            "ORDER BY stadium_id LIMIT 30"
        )
    if spoke == "team":
        return (
            "SELECT team_id, region_name, team_name, e_team_name, stadium_id, homepage "
            "FROM moneyball_team "
            f"WHERE team_name ILIKE '{like}' OR region_name ILIKE '{like}' "
            f"OR e_team_name ILIKE '{like}' OR team_id ILIKE '{like}' "
            "ORDER BY team_id LIMIT 30"
        )
    if spoke == "player":
        return (
            "SELECT p.player_id, p.player_name, p.position, p.back_no, p.nation, "
            "p.team_id, t.team_name "
            "FROM moneyball_player p "
            "LEFT JOIN moneyball_team t ON t.team_id = p.team_id "
            f"WHERE p.player_name ILIKE '{like}' OR t.team_name ILIKE '{like}' "
            f"OR t.region_name ILIKE '{like}' OR p.nation ILIKE '{like}' "
            f"OR p.position ILIKE '{like}' "
            "ORDER BY p.team_id, p.back_no NULLS LAST LIMIT 30"
        )
    return (
        "SELECT s.sche_date, s.stadium_id, s.gubun, s.hometeam_id, s.awayteam_id, "
        "s.home_score, s.away_score, st.stadium_name "
        "FROM moneyball_schedule s "
        "LEFT JOIN moneyball_stadium st ON st.stadium_id = s.stadium_id "
        f"WHERE s.hometeam_id ILIKE '{like}' OR s.awayteam_id ILIKE '{like}' "
        f"OR st.stadium_name ILIKE '{like}' "
        "ORDER BY s.sche_date DESC LIMIT 30"
    )


def heuristic_answer(question: str, steps: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    total_rows = 0
    for step in steps:
        spoke = step.get("spoke", "?")
        err = step.get("error")
        rows = step.get("rows_preview") or []
        n = step.get("row_count") or len(rows)
        total_rows += int(n)
        if err:
            parts.append(f"[{spoke}] 조회 실패: {err}")
            continue
        if not rows:
            parts.append(f"[{spoke}] 결과 없음")
            continue
        sample = rows[:5]
        lines = []
        for row in sample:
            lines.append(", ".join(f"{k}={v}" for k, v in row.items() if v is not None))
        parts.append(f"[{spoke}] {n}건\n" + "\n".join(lines))

    if total_rows == 0:
        return "DB에 해당 데이터가 없습니다. 질문의 팀·선수·구장명을 확인해 주세요."

    body = "\n\n".join(parts)
    return (
        f"질문 «{question}»에 대한 Moneyball DB 조회 결과입니다.\n\n"
        f"{body}\n\n"
        "* 허브/스포크 모델이 준비되면 EXAONE이 이 결과를 자연어로 다듬습니다."
    )
