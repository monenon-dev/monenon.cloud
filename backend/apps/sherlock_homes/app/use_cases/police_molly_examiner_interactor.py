from __future__ import annotations

from sherlock_homes.adapter.inbound.api.schemas.police_molly_examiner_schema import MollyExaminerSchema
from sherlock_homes.app.dtos.police_molly_examiner_dto import MollyExaminerQuery, MollyExaminerResponse
from sherlock_homes.app.ports.input.police_molly_examiner_use_case import MollyExaminerUseCase
from sherlock_homes.app.ports.output.police_molly_examiner_port import MollyExaminerPort


class MollyExaminerInteractor(MollyExaminerUseCase):

    def __init__(self, repository: MollyExaminerPort):
        self.repository = repository

    async def introduce_myself(self, schema: MollyExaminerSchema) -> MollyExaminerResponse:
        '''몰리 후퍼의 자기소개 인터렉트'''
        return await self.repository.introduce_myself(MollyExaminerQuery(
            id=schema.id,
            name=schema.name
        ))
