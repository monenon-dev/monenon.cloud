"""NCL 여행 추천 — LangChain LCEL (ChatPromptTemplate | ChatOllama | StrOutputParser).

헥사고날: LangChain 심볼은 이 outbound client 에만 둔다.
"""

from __future__ import annotations

import logging

from langchain_community.chat_models import ChatOllama
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate

from lol.config import get_ollama_base_url, get_ollama_model
from silicon_valley.app.ports.output.ncl_trip_planner_generator_port import (
    NclTripPlannerGeneratorPort,
)
from silicon_valley.domain.customer_profile import CustomerProfile

logger = logging.getLogger(__name__)

NCL_TRIP_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "당신은 NCL(노르웨이 크루즈 라인) 여행 큐레이터다. "
            "고객의 선호도와 탐색·예약 이력을 반영해 구체적이고 실용적인 크루즈 여행 계획을 "
            "한국어로 제안한다. 없는 사실을 지어내지 말고, 선호와 예산을 우선한다.\n\n"
            "고객 프로필:\n"
            "- customer_id: {customer_id}\n"
            "- 선호 목적지: {preferred_destinations}\n"
            "- 선실 등급: {cabin_class}\n"
            "- 예산: {budget_range}\n"
            "- 최근 탐색: {recent_browsing}\n"
            "- 과거 예약: {past_bookings}",
        ),
        ("human", "{question}"),
    ]
)


def _join(items: tuple[str, ...]) -> str:
    return ", ".join(items) if items else "(없음)"


class NclTripPlannerGeneratorClient(NclTripPlannerGeneratorPort):
    """프로필 + 질문 → 맞춤형 여행 추천."""

    def __init__(
        self,
        *,
        base_url: str | None = None,
        model: str | None = None,
    ) -> None:
        self._base_url = (base_url or get_ollama_base_url()).rstrip("/")
        self._model = model or get_ollama_model()
        self._chain = None

    def _get_chain(self):
        if self._chain is None:
            llm = ChatOllama(
                base_url=self._base_url,
                model=self._model,
                temperature=0.4,
            )
            self._chain = NCL_TRIP_PROMPT | llm | StrOutputParser()
            logger.info(
                "[ncl/generator] LangChain chain ready base_url=%s model=%s",
                self._base_url,
                self._model,
            )
        return self._chain

    async def plan(self, *, profile: CustomerProfile, question: str) -> str:
        chain = self._get_chain()
        text = await chain.ainvoke(
            {
                "customer_id": profile.customer_id,
                "preferred_destinations": _join(profile.preferred_destinations),
                "cabin_class": profile.cabin_class or "(미지정)",
                "budget_range": profile.budget_range or "(미지정)",
                "recent_browsing": _join(profile.recent_browsing),
                "past_bookings": _join(profile.past_bookings),
                "question": question.strip(),
            }
        )
        return (text or "").strip()
