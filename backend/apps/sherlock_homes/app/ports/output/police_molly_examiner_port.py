from __future__ import annotations

from abc import ABC, abstractmethod

from sherlock_homes.app.dtos.police_molly_examiner_dto import MollyExaminerQuery, MollyExaminerResponse


class MollyExaminerPort(ABC):

    @abstractmethod
    def introduce_myself(self, query: MollyExaminerQuery) -> MollyExaminerResponse:
        '''몰리 후퍼의 자기 소개 레포지토리 추상 메소드'''
        pass
