"""질문 의사 분류기 출력 포트 — 유스케이스가 호출하는 파서 의존성."""

from __future__ import annotations

from abc import ABC, abstractmethod

from moneyball.domain.question_classification import QuestionClassification


class QuestionClassifierPort(ABC):
    """질문을 엔티티·intent·스포크로만 분해한다. 최종 답변 생성 금지."""

    @abstractmethod
    async def classify(self, question: str) -> QuestionClassification:
        """JSON/휴리스틱 파싱 결과를 반환. 실패 시에도 빈 spokes 대신 heuristic 권장."""
