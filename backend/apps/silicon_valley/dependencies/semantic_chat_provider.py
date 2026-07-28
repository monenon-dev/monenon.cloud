"""시맨틱 채팅 DI — intent router + profile repository + LangChain NCL generator."""

from __future__ import annotations

from silicon_valley.adapter.outbound.repository.ncl_customer_profile_repository import (
    NclCustomerProfileRepository,
)
from silicon_valley.adapter.outbound.semantic.keyword_intent_router import (
    KeywordSemanticIntentRouter,
)
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
from silicon_valley.app.use_cases.semantic_chat_interactor import SemanticChatInteractor


def get_semantic_intent_router() -> SemanticIntentRouterPort:
    return KeywordSemanticIntentRouter()


def get_ncl_customer_profile_repository() -> NclCustomerProfileRepositoryPort:
    return NclCustomerProfileRepository()


def get_ncl_trip_planner_generator() -> NclTripPlannerGeneratorPort:
    # LangChain 은 여기서만 로드 (라우터 import 시 실패 방지)
    from silicon_valley.adapter.outbound.client.ncl_trip_planner_generator_client import (
        NclTripPlannerGeneratorClient,
    )

    return NclTripPlannerGeneratorClient()


def get_semantic_chat_use_case() -> SemanticChatUseCase:
    generator: NclTripPlannerGeneratorPort | None
    try:
        generator = get_ncl_trip_planner_generator()
    except Exception as exc:  # noqa: BLE001 — 서버 기동은 유지, 호출 시 안내
        import logging

        logging.getLogger(__name__).warning(
            "NCL LangChain generator unavailable: %s", exc
        )
        generator = None

    return SemanticChatInteractor(
        intent_router=get_semantic_intent_router(),
        profile_repository=get_ncl_customer_profile_repository(),
        ncl_generator=generator,
    )
