"""종족(Race) 온톨로지 — 초보자용 메타포 + 툴 카탈로그.

저그 = 비전 처리, 프로토스 = 자동 보고서(LLM), 테란 = 시계열 추론.
비전 툴 코드는 star_craft/zerg 아래에 둔다.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RaceTool:
    """종족에 속한 실행 툴(UI 또는 백엔드 모듈)."""

    id: str
    title: str
    path: str
    role: str
    kind: str  # "ui" | "backend"


@dataclass(frozen=True)
class Race:
    id: str  # zerg | protoss | terran
    name_ko: str
    capability: str
    metaphor: str
    one_liner: str
    tools: tuple[RaceTool, ...]


# 저그(비전) — 레나 vision UI + Face YOLO 백엔드
ZERG_VISION_TOOLS: tuple[RaceTool, ...] = (
    RaceTool(
        id="lena_vision",
        title="레나 vision",
        path="frontend/app/star-craft/zerg/vision",
        role="수업 UI — 이미지 업로드·미리보기 (/star-craft/zerg/vision)",
        kind="ui",
    ),
    RaceTool(
        id="face_yolo",
        title="Face YOLO",
        path="backend/apps/star_craft/zerg/face",
        role="YOLO 얼굴·객체 학습·추론 (CLI: train/predict)",
        kind="backend",
    ),
)

RACE_ONTOLOGY: tuple[Race, ...] = (
    Race(
        id="zerg",
        name_ko="저그",
        capability="vision",
        metaphor="눈·감각·탐지 — 전장을 보고 반응한다",
        one_liner="저그 = 눈 (본다)",
        tools=ZERG_VISION_TOOLS,
    ),
    Race(
        id="protoss",
        name_ko="프로토스",
        capability="llm_report",
        metaphor="칼라·기록보관소 — 지식을 모아 말로 전달한다",
        one_liner="프로토스 = 입/지성 (말하고 정리한다)",
        tools=(),  # 추후 LLM 자동 보고서 툴 편입
    ),
    Race(
        id="terran",
        name_ko="테란",
        capability="timeseries",
        metaphor="공장·빌드오더 — 시간축으로 측정하고 예측한다",
        one_liner="테란 = 시계/공장 (시간에 맞춰 계산한다)",
        tools=(),  # 추후 시계열 추론 툴 편입
    ),
)


def get_race(race_id: str) -> Race | None:
    for race in RACE_ONTOLOGY:
        if race.id == race_id:
            return race
    return None


def races_as_dict() -> list[dict]:
    return [
        {
            "id": r.id,
            "name_ko": r.name_ko,
            "capability": r.capability,
            "metaphor": r.metaphor,
            "one_liner": r.one_liner,
            "tools": [
                {
                    "id": t.id,
                    "title": t.title,
                    "path": t.path,
                    "role": t.role,
                    "kind": t.kind,
                }
                for t in r.tools
            ],
        }
        for r in RACE_ONTOLOGY
    ]
