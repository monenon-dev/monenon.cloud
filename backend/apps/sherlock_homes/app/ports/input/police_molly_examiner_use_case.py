from __future__ import annotations

from abc import ABC, abstractmethod

from sherlock_homes.adapter.inbound.api.schemas.police_molly_examiner_schema import MollyExaminerSchema
from sherlock_homes.app.dtos.police_molly_examiner_dto import MollyExaminerResponse


class MollyExaminerUseCase(ABC):

    @abstractmethod
    async def introduce_myself(self, schema: MollyExaminerSchema) -> MollyExaminerResponse:
        '''몰리 후퍼의 자기소개 메소드'''
        pass
