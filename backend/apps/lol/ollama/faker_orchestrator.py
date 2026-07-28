"""lol core — EXAONE 비동기 오케스트레이터 (Thomas-Watson 패턴)."""

from __future__ import annotations

import httpx

from lol.config import get_ollama_base_url, get_ollama_model


class FakerOrchestrator:
    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
        timeout: float = 60.0,
    ) -> None:
        self.base_url = (base_url or get_ollama_base_url()).rstrip("/")
        self.model = model or get_ollama_model()
        self.timeout = timeout

    async def chat(self, messages: list[dict], *, model: str | None = None) -> str:
        use_model = model or self.model
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/api/chat",
                json={"model": use_model, "messages": messages, "stream": False},
            )
            response.raise_for_status()
            return response.json()["message"]["content"]

    async def generate(self, prompt: str) -> str:
        """단순 텍스트 생성 (채팅 형식 없이)."""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json={"model": self.model, "prompt": prompt, "stream": False},
            )
            response.raise_for_status()
            return response.json()["response"].strip()

    async def embed(self, text: str, *, embed_model: str = "nomic-embed-text") -> list[float]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/api/embeddings",
                json={"model": embed_model, "prompt": text},
            )
            response.raise_for_status()
            return response.json()["embedding"]


faker_orchestrator = FakerOrchestrator()
