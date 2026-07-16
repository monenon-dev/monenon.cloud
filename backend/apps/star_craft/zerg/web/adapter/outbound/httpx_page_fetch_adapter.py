"""httpx 페이지 페치 어댑터."""

from __future__ import annotations

import httpx

from star_craft.zerg.web.app.ports.output.page_fetch_port import PageFetchPort

_DEFAULT_HEADERS = {
    "User-Agent": "MonenonZergBot/1.0 (+https://monenon.cloud; research)",
    "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
}


class HttpxPageFetchAdapter(PageFetchPort):
    def __init__(self, *, timeout: float = 20.0) -> None:
        self._timeout = timeout

    async def fetch_html(self, url: str) -> str:
        async with httpx.AsyncClient(
            timeout=self._timeout,
            follow_redirects=True,
            headers=_DEFAULT_HEADERS,
        ) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            return resp.text
