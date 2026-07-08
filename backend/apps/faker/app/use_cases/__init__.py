"""faker 유스케이스 — EXAONE 오케스트레이터 (직접 호출, LangGraph 없음)."""

from __future__ import annotations

import logging

from faker.domain import OrchestratorState

logger = logging.getLogger(__name__)


async def dispatch(query: str, user_id: int | None = None) -> dict:
    """
    n8n → faker → star_craft 라우팅 → 결과 반환.
    LangGraph 없이 EXAONE 직접 호출.
    """
    state = OrchestratorState(query=query, user_id=user_id)

    # Step 1 — star_craft 허브로 라우팅 요청
    state.status = "routing"
    try:
        from star_craft.app.use_cases import ContextRoutingUseCase
        from star_craft.adapter.outbound.neo4j_graph_repository import Neo4jGraphRepository

        # vector repo 없이 Neo4j만으로 라우팅 (세션 없는 단순 호출)
        from lol.ollama.faker_orchestrator import faker_orchestrator
        from star_craft.app.ports.output import GraphRepositoryPort
        graph_repo = Neo4jGraphRepository()
        spokes = await graph_repo.get_active_spokes()

        if not spokes:
            state.status = "error"
            state.error = "등록된 스포크 없음 — POST /hub/seed 먼저 실행"
            return {"status": state.status, "spoke": None, "result": {"error": state.error}, "messages": []}

        import json
        spoke_list = "\n".join(f"- {s.name}: {s.description}" for s in spokes)
        messages = [
            {"role": "system", "content": (
                "당신은 멀티 에이전트 오케스트레이터 Faker입니다.\n"
                f"사용 가능한 에이전트:\n{spoke_list}\n\n"
                '반드시 JSON으로만 응답: {"spoke": "이름", "confidence": 0.9, "reason": "이유"}'
            )},
            {"role": "user", "content": query},
        ]
        raw = await faker_orchestrator.chat(messages)
        data = json.loads(raw[raw.find("{"):raw.rfind("}") + 1])
        state.spoke = data["spoke"]
        state.messages.append({"role": "system", "content": f"[라우팅] {state.spoke} 선택"})
    except Exception as exc:
        logger.warning("[faker] 라우팅 실패: %s", exc)
        state.status = "error"
        state.error = str(exc)
        return {"status": state.status, "spoke": None, "result": {"error": state.error}, "messages": state.messages}

    # Step 2 — EXAONE이 최종 응답 생성
    state.status = "executing"
    try:
        from lol.ollama.faker_orchestrator import faker_orchestrator
        reply_messages = state.messages + [
            {"role": "user", "content": f"사용자 요청: {query}\n담당 에이전트: {state.spoke}\n처리 결과를 친절하게 알려주세요."}
        ]
        reply = await faker_orchestrator.chat(reply_messages)
        state.spoke_result = {"reply": reply, "spoke": state.spoke}
        state.status = "done"
    except Exception as exc:
        logger.warning("[faker] 응답 생성 실패: %s", exc)
        state.spoke_result = {"spoke": state.spoke, "reply": f"{state.spoke} 에이전트로 라우팅 완료"}
        state.status = "done"

    return {
        "status": state.status,
        "spoke": state.spoke,
        "result": state.spoke_result,
        "messages": state.messages,
    }
