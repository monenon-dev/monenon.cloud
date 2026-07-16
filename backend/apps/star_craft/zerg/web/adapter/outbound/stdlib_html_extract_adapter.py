"""stdlib HTMLParser 기반 링크·스니펫 추출."""

from __future__ import annotations

import re
from html.parser import HTMLParser
from urllib.parse import urljoin, urldefrag

from star_craft.zerg.web.app.ports.output.html_extract_port import HtmlExtractPort

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


class _LinkCollector(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return
        for key, val in attrs:
            if key.lower() == "href" and val:
                self.hrefs.append(val)


class StdlibHtmlExtractAdapter(HtmlExtractPort):
    def extract_links(self, html: str, *, base_url: str) -> list[str]:
        parser = _LinkCollector()
        try:
            parser.feed(html or "")
        except Exception:
            return []
        out: list[str] = []
        seen: set[str] = set()
        for href in parser.hrefs:
            absolute = urljoin(base_url, href)
            absolute, _ = urldefrag(absolute)
            if not absolute.startswith(("http://", "https://")):
                continue
            if absolute in seen:
                continue
            seen.add(absolute)
            out.append(absolute)
        return out

    def extract_snippets(
        self,
        html: str,
        keywords: list[str],
        *,
        context_chars: int = 120,
    ) -> list[tuple[str, str]]:
        text = _TAG_RE.sub(" ", html or "")
        text = _WS_RE.sub(" ", text).strip()
        if not text:
            return []
        lower = text.lower()
        pairs: list[tuple[str, str]] = []
        for kw in keywords:
            needle = kw.lower()
            start = 0
            while True:
                idx = lower.find(needle, start)
                if idx < 0:
                    break
                left = max(0, idx - context_chars)
                right = min(len(text), idx + len(kw) + context_chars)
                excerpt = text[left:right].strip()
                pairs.append((kw, excerpt))
                start = idx + max(len(kw), 1)
                if len(pairs) >= 50:
                    return pairs
        return pairs
