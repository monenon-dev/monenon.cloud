import { NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/api-base";

type RunRequest = {
  mode?: "crawler" | "scraper";
  url?: string;
  command?: string;
};

/** 자연어 명령어에서 키워드 추출 (공백 분리, 한국어 조사 제거) */
function extractKeywords(command: string): string[] {
  const stopWords = new Set([
    "이",
    "가",
    "을",
    "를",
    "은",
    "는",
    "에서",
    "에",
    "의",
    "로",
    "으로",
    "과",
    "와",
    "도",
    "만",
    "부터",
    "까지",
    "한테",
    "께서",
    "에게",
    "에서는",
    "모든",
    "모두",
    "다",
    "이것",
    "그것",
    "저것",
    "해줘",
    "해줘요",
    "가져와줘",
    "가져와",
    "줘",
    "해주세요",
    "추출해줘",
    "수집해줘",
    "찾아줘",
    "보여줘",
    "알려줘",
    "정리해줘",
    "표",
    "형식",
    "으로",
    "로",
    "이",
    "페이지",
    "이",
    "사이트",
    "웹",
  ]);

  return command
    .split(/[\s,，、.。]+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !stopWords.has(w))
    .slice(0, 10);
}

export async function POST(request: Request) {
  let body: RunRequest;
  try {
    body = (await request.json()) as RunRequest;
  } catch {
    return NextResponse.json({ error: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const mode = body.mode ?? "crawler";
  const url = String(body.url ?? "").trim();
  const command = String(body.command ?? "").trim();

  if (!url) {
    return NextResponse.json({ error: "사이트 주소를 입력해 주세요." }, { status: 400 });
  }

  const keywords = command ? extractKeywords(command) : [];
  const apiBase = getApiBaseUrl();

  if (mode === "crawler") {
    const backendUrl = `${apiBase}/star-craft/zerg/zerling/crawl`;
    let res: Response;
    try {
      res = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sites: [url],
          keywords,
          max_pages: 10,
          max_depth: 1,
        }),
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "백엔드 연결에 실패했습니다." },
        { status: 502 }
      );
    }

    const data = (await res.json()) as Record<string, unknown>;
    if (!res.ok) {
      return NextResponse.json(
        { error: String(data.detail ?? data.error ?? "크롤링 중 오류가 발생했습니다.") },
        { status: res.status }
      );
    }

    const pages = (data.pages as Array<{ url: string; matched_keywords: string[]; depth: number }>) ?? [];
    const lines = [
      `크롤링 완료 — 수집된 페이지 수: ${pages.length}`,
      keywords.length > 0 ? `키워드: ${keywords.join(", ")}` : null,
      "",
      ...pages.map(
        (p, i) =>
          `[${i + 1}] ${p.url}${p.matched_keywords.length > 0 ? `\n     매칭 키워드: ${p.matched_keywords.join(", ")}` : ""}`
      ),
    ].filter((l) => l !== null);

    return NextResponse.json({ output: lines.join("\n") || "(수집된 페이지가 없습니다.)" });
  }

  /* scraper */
  const backendUrl = `${apiBase}/star-craft/zerg/hydralisk/scrape`;
  let res: Response;
  try {
    res = await fetch(backendUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sites: [url],
        keywords,
        max_pages: 5,
      }),
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "백엔드 연결에 실패했습니다." },
      { status: 502 }
    );
  }

  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    return NextResponse.json(
      { error: String(data.detail ?? data.error ?? "스크래핑 중 오류가 발생했습니다.") },
      { status: res.status }
    );
  }

  const snippets =
    (data.snippets as Array<{ url: string; keyword: string; excerpt: string }>) ?? [];
  const lines = [
    `스크래핑 완료 — 추출된 스니펫 수: ${snippets.length}`,
    keywords.length > 0 ? `키워드: ${keywords.join(", ")}` : null,
    "",
    ...snippets.map(
      (s, i) => `[${i + 1}] ${s.url}\n     키워드: ${s.keyword}\n     발췌: ${s.excerpt}`
    ),
  ].filter((l) => l !== null);

  return NextResponse.json({ output: lines.join("\n") || "(추출된 내용이 없습니다.)" });
}
