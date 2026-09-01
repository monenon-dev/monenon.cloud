"""HTML에서 링크·키워드 스니펫 추출 포트."""

from __future__ import annotations

from abc import ABC, abstractmethod


class HtmlExtractPort(ABC):
    @abstractmethod
    def extract_links(self, html: str, *, base_url: str) -> list[str]:
        """절대 URL 링크 목록."""

    @abstractmethod
    def extract_snippets(
        self,
        html: str,
        keywords: list[str],
        *,
        context_chars: int = 120,
    ) -> list[tuple[str, str]]:
        """(keyword, excerpt) 목록."""
