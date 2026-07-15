"""Moneyball 스포크 — star_craft 허브에 등록할 노드 정의."""

from __future__ import annotations

from star_craft.domain import SpokeNode

from moneyball.app.ontology.star import SpokeId

_MONEYBALL_SPOKE_META: dict[SpokeId, dict] = {
    "stadium": {
        "description": "K리그 경기장·홈구장·좌석·주소·연락처 조회 (moneyball_stadium)",
        "endpoint": "/api/moneyball/spoke/stadium",
        "keywords": ["경기장", "홈구장", "구장", "스타디움", "좌석", "주소"],
    },
    "team": {
        "description": "K리그 클럽·연고지·창단·구단주·홈페이지 조회 (moneyball_team)",
        "endpoint": "/api/moneyball/spoke/team",
        "keywords": ["팀", "구단", "클럽", "연고", "전북", "울산", "서울", "수원"],
    },
    "player": {
        "description": "K리그 선수·포지션·등번호·국적·신체 조회 (moneyball_player)",
        "endpoint": "/api/moneyball/spoke/player",
        "keywords": ["선수", "포지션", "등번호", "백넘버", "국적", "FW", "MF", "DF", "GK"],
    },
    "schedule": {
        "description": "K리그 경기 일정·스코어·홈/원정·대진 조회 (moneyball_schedule)",
        "endpoint": "/api/moneyball/spoke/schedule",
        "keywords": ["일정", "경기", "스코어", "대진", "승패", "점수"],
    },
}


def moneyball_spoke_nodes() -> list[SpokeNode]:
    """star_craft Hub → ORCHESTRATES → moneyball 스포크."""
    return [
        SpokeNode(
            name=f"moneyball.{sid}",
            description=meta["description"],
            endpoint=meta["endpoint"],
            keywords=meta["keywords"],
            race="terran",
        )
        for sid, meta in _MONEYBALL_SPOKE_META.items()
    ]


def spoke_id_from_node_name(name: str) -> SpokeId | None:
    if name.startswith("moneyball."):
        sid = name.split(".", 1)[1]
        if sid in ("stadium", "team", "player", "schedule"):
            return sid  # type: ignore[return-value]
    return None
