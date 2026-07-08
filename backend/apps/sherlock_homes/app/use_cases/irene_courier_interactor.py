from __future__ import annotations

from sherlock_homes.adapter.inbound.api.schemas.irene_courier_schema import IreneCourierSchema
from sherlock_homes.app.dtos.irene_courier_dto import IreneCourierCommand, IreneCourierResponse
from sherlock_homes.app.ports.input.irene_courier_use_case import IreneCourierUseCase
from sherlock_homes.app.ports.output.irene_courier_email_sender_port import IreneCourierEmailSenderPort
from lol.ollama.faker_orchestrator import FakerOrchestrator


class IreneCourierInteractor(IreneCourierUseCase):

    def __init__(self, email_sender: IreneCourierEmailSenderPort, orchestrator: FakerOrchestrator):
        self.email_sender = email_sender
        self.orchestrator = orchestrator

    async def send_email(self, schema: IreneCourierSchema) -> IreneCourierResponse:
        command = IreneCourierCommand(to=schema.to, subject=schema.subject, prompt=schema.prompt)

        body = await self.orchestrator.generate(command.prompt)

        success = await self.email_sender.send(
            to=command.to,
            subject=command.subject,
            body=body,
        )

        return IreneCourierResponse(
            success=success,
            to=command.to,
            message="이메일이 발송되었습니다." if success else "이메일 발송에 실패했습니다.",
        )
