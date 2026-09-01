"""시맨틱 채팅 인터랙터 — 의도 분류 후 엔진 위임 (repository까지 배선)."""

from __future__ import annotations

from silicon_valley.app.dto.semantic_chat_dto import SemanticChatQuery, SemanticChatResult
from silicon_valley.app.ports.input.semantic_chat_use_case import SemanticChatUseCase
from silicon_valley.app.ports.output.ncl_customer_profile_repository_port import (
    NclCustomerProfileRepositoryPort,
)
from silicon_valley.app.ports.output.ncl_trip_planner_generator_port import (
    NclTripPlannerGeneratorPort,
)
from silicon_valley.app.ports.output.semantic_intent_router_port import (
    SemanticIntentRouterPort,
)
from silicon_valley.domain.langchain_intent import LangchainSpokeIntent


class SemanticChatInteractor(SemanticChatUseCase):
    def __init__(
        self,
        *,
        intent_router: SemanticIntentRouterPort,
        profile_repository: NclCustomerProfileRepositoryPort,
        ncl_generator: NclTripPlannerGeneratorPort | None = None,
    ) -> None:
        self._intent_router = intent_router
        self._profile_repository = profile_repository
        self._ncl_generator = ncl_generator

    async def chat(self, query: SemanticChatQuery) -> SemanticChatResult:
        routed = await self._intent_router.route(query.message)
        intent = routed.intent

        if intent == LangchainSpokeIntent.CLARIFY:
            return SemanticChatResult(
                ok=True,
                intent=intent.value,
                handler=routed.handler,
                confidence=routed.confidence,
                reply=(
                    "여행·재무 인사이트·보안 알럿 중 무엇을 도와드릴까요? "
                    "예: '알래스카 크루즈 추천', '분기 실적 요약', '최근 보안 알럿 요약'"
                ),
                channel="clarify",
                reason=routed.reason,
            )

        if intent == LangchainSpokeIntent.OUT_OF_SCOPE:
            return SemanticChatResult(
                ok=True,
                intent=intent.value,
                handler=routed.handler,
                confidence=routed.confidence,
                reply="지원하지 않는 요청입니다.",
                channel="reject",
                reason=routed.reason,
            )

        if intent == LangchainSpokeIntent.MORNINGSTAR:
            return SemanticChatResult(
                ok=True,
                intent=intent.value,
                handler=routed.handler,
                confidence=routed.confidence,
                reply=(
                    "Morningstar 인사이트 엔진으로 라우팅되었습니다. "
                    "엔진 슬라이스(repository·LangChain client)는 후속 구현입니다."
                ),
                channel="morningstar",
                reason=routed.reason,
            )

        if intent == LangchainSpokeIntent.ELASTIC:
            return SemanticChatResult(
                ok=True,
                intent=intent.value,
                handler=routed.handler,
                confidence=routed.confidence,
                reply=(
                    "Elastic 보안 어시스턴트로 라우팅되었습니다. "
                    "알럿 repository·LangChain client는 후속 구현입니다."
                ),
                channel="elastic",
                reason=routed.reason,
            )

        # NCL_TRIP — 프로필 repository 조회 후 generator 포트
        customer_id = (query.customer_id or "c-001").strip() or "c-001"
        profile = await self._profile_repository.get_by_customer_id(customer_id)
        if profile is None:
            return SemanticChatResult(
                ok=False,
                intent=intent.value,
                handler=routed.handler,
                confidence=routed.confidence,
                reply=f"고객 프로필을 찾을 수 없습니다: {customer_id}",
                channel="ncl",
                reason="profile_not_found",
            )

        if self._ncl_generator is None:
            return SemanticChatResult(
                ok=True,
                intent=intent.value,
                handler=routed.handler,
                confidence=routed.confidence,
                reply=(
                    f"[NCL 라우팅 완료] customer={profile.customer_id} "
                    f"dest={list(profile.preferred_destinations)} "
                    f"cabin={profile.cabin_class}. "
                    "LangChain generator client는 다음 단계에서 연결합니다."
                ),
                channel="ncl",
                reason=routed.reason,
            )

        try:
            recommendation = await self._ncl_generator.plan(
                profile=profile, question=query.message
            )
        except RuntimeError as exc:
            return SemanticChatResult(
                ok=False,
                intent=intent.value,
                handler=routed.handler,
                confidence=routed.confidence,
                reply=str(exc),
                channel="ncl",
                reason="ollama_unavailable",
            )

        return SemanticChatResult(
            ok=True,
            intent=intent.value,
            handler=routed.handler,
            confidence=routed.confidence,
            reply=recommendation,
            channel="ncl",
            reason=routed.reason,
        )
