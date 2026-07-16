"""HTTP 페이지 페치 포트."""

from __future__ import annotations

from abc import ABC, abstractmethod


class PageFetchPort(ABC):
    @abstractmethod
    async def fetch_html(self, url: str) -> str:
        """URL HTML 본문. 실패 시 예외."""
