"""star_craft 유스케이스 — Neo4j + pgvector + EXAONE 컨텍스트 라우팅."""

from __future__ import annotations

import json
import logging

from star_craft.app.ports.output import GraphRepositoryPort, VectorRepositoryPort
from star_craft.domain import RouteResult, SpokeNode

logger = logging.getLogger(__name__)

DEFAULT_SPOKES: list[dict] = [
    {"name": "mail",         "description": "Gmail 수신함 관리, 이메일 필터링·요약",      "endpoint": "/mail/webhook",          "keywords": ["메일", "이메일", "gmail"]},
    {"name": "closet",       "description": "날씨 기반 옷 추천, 코디 큐레이션",           "endpoint": "/platform/closet",       "keywords": ["옷", "코디", "날씨", "패션"]},
    {"name": "music",        "description": "상황·무드 기반 음악 플레이리스트 추천",      "endpoint": "/platform/music",        "keywords": ["음악", "플레이리스트", "노래"]},
    {"name": "refrigerator", "description": "냉장고 재료 관리, 요리·장보기 추천",         "endpoint": "/platform/refrigerator", "keywords": ["냉장고", "재료", "요리", "장보기"]},
    # 저그(비전) — 레나 vision UI + Face YOLO (star_craft/domain/race_ontology.py)
    {
        "name": "vision",
        "description": "저그(비전 처리) — 컴퓨터 비전·이미지 분석. 레나 vision 수업 UI + Face YOLO 학습·추론",
        "endpoint": "/lesson/vision",
        "keywords": ["비전", "vision", "이미지", "저그", "레나", "YOLO", "얼굴", "객체탐지"],
        "race": "zerg",
    },
]


class ContextRoutingUseCase:
    """
    파이프라인:
    1. pgvector 유사도 검색 → 후보 스포크
    2. Neo4j 경로 확인 → 유효 스포크
    3. EXAONE(Faker) 최종 결정
    """

    def __init__(self, graph_repo: GraphRepositoryPort, vector_repo: VectorRepositoryPort) -> None:
        self._graph = graph_repo
        self._vector = vector_repo

    async def seed(self) -> None:
        from lol.ollama.faker_orchestrator import faker_orchestrator
        await self._graph.seed_hub()
        for s in DEFAULT_SPOKES:
            spoke = SpokeNode(
                name=s["name"],
                description=s["description"],
                endpoint=s["endpoint"],
                keywords=s["keywords"],
                race=s.get("race"),
            )
            await self._graph.register_spoke(spoke)
            try:
                embedding = await faker_orchestrator.embed(s["description"])
                await self._vector.upsert_spoke_context(s["name"], s["description"], embedding)
            except Exception as exc:
                logger.warning("[star_craft] 임베딩 실패 (seed): %s", exc)

    async def route(self, query: str) -> RouteResult:
        from lol.ollama.faker_orchestrator import faker_orchestrator

        # Step 1 — 벡터 유사도
        try:
            q_embedding = await faker_orchestrator.embed(query)
            candidates_scored = await self._vector.search_similar_spokes(q_embedding, top_k=3)
            candidate_names = [c[0] for c in candidates_scored]
        except Exception as exc:
            logger.warning("[star_craft] 벡터 검색 실패: %s", exc)
            candidate_names = [s["name"] for s in DEFAULT_SPOKES]

        # Step 2 — Neo4j 경로 확인
        valid = await self._graph.get_spoke_path(candidate_names) or await self._graph.get_active_spokes()

        # Step 3 — EXAONE 최종 결정
        spoke_list = "\n".join(f"- {s.name}: {s.description}" for s in valid)
        messages = [
            {"role": "system", "content": (
                "당신은 멀티 에이전트 라우터입니다.\n"
                f"후보 에이전트:\n{spoke_list}\n\n"
                '반드시 JSON으로만 응답: {"spoke": "이름", "confidence": 0.9, "reason": "이유"}'
            )},
            {"role": "user", "content": query},
        ]
        try:
            raw = await faker_orchestrator.chat(messages)
            data = json.loads(raw[raw.find("{"):raw.rfind("}") + 1])
            return RouteResult(spoke=data["spoke"], confidence=float(data.get("confidence", 0.8)),
                               reason=data.get("reason", ""), candidates=candidate_names)
        except Exception as exc:
            logger.warning("[star_craft] EXAONE 라우팅 파싱 실패: %s", exc)
            return RouteResult(spoke=valid[0].name, confidence=0.5,
                               reason="파싱 실패 — 첫 번째 후보 선택", candidates=candidate_names)

    async def register_spoke(self, spoke: SpokeNode) -> None:
        from lol.ollama.faker_orchestrator import faker_orchestrator
        await self._graph.register_spoke(spoke)
        try:
            embedding = await faker_orchestrator.embed(spoke.description)
            await self._vector.upsert_spoke_context(spoke.name, spoke.description, embedding)
        except Exception as exc:
            logger.warning("[star_craft] 임베딩 실패 (register): %s", exc)

    async def get_spokes(self) -> list[SpokeNode]:
        return await self._graph.get_active_spokes()
