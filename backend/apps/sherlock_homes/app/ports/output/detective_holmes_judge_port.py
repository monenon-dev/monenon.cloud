from __future__ import annotations

from abc import ABC, abstractmethod

from sherlock_homes.app.dtos.detective_holmes_judge_dto import HolmesJudgeQuery, HolmesJudgeResponse


class HolmesJudgePort(ABC):

    @abstractmethod
    def introduce_myself(self, query: HolmesJudgeQuery) -> HolmesJudgeResponse:
        '''셜록 홈즈의 자기 소개 레포지토리 추상 메소드'''
        pass
