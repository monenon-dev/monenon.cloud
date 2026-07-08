from __future__ import annotations

import os

import httpx

from sherlock_homes.app.ports.output.irene_courier_email_sender_port import IreneCourierEmailSenderPort

_WEBHOOK_URL = os.getenv("N8N_EMAIL_WEBHOOK_URL", "http://localhost:5678/webhook/send-email")


class IreneCourierN8nEmailSender(IreneCourierEmailSenderPort):

    def __init__(self, webhook_url: str = _WEBHOOK_URL, timeout: float = 30.0) -> None:
        self.webhook_url = webhook_url
        self.timeout = timeout

    async def send(self, to: str, subject: str, body: str) -> bool:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                self.webhook_url,
                json={"to": to, "subject": subject, "body": body},
            )
            return response.is_success
