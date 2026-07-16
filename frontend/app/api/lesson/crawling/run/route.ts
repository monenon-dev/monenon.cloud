import { NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/api-base";

type RunRequest = {
  mode?: "crawler" | "scraper";
  url?: string;
  command?: string;
};

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

  const apiBase = getApiBaseUrl();
  let res: Response;
  try {
    res = await fetch(`${apiBase}/star-craft/zerg/lesson/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, url, command }),
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
      { error: String(data.detail ?? data.error ?? "실행 중 오류가 발생했습니다.") },
      { status: res.status }
    );
  }

  // 결과를 읽기 좋은 텍스트로 변환
  const savedFile = data.saved_file ? `\n저장 파일: ${data.saved_file}` : "";
  const keywords = (data.keywords as string[]) ?? [];

  let output: string;
  if (mode === "crawler") {
    const pages = (data.pages as Array<{ url: string; matched_keywords: string[]; depth: number }>) ?? [];
    const lines = [
      `크롤링 완료 — 수집된 페이지: ${pages.length}개`,
      keywords.length > 0 ? `키워드: ${keywords.join(", ")}` : null,
      savedFile,
      "",
      ...pages.map(
        (p, i) =>
          `[${i + 1}] ${p.url}${p.matched_keywords.length > 0 ? `\n     매칭: ${p.matched_keywords.join(", ")}` : ""}`
      ),
    ].filter((l) => l !== null);
    output = lines.join("\n") || "(수집된 페이지가 없습니다.)";
  } else {
    const snippets = (data.snippets as Array<{ url: string; keyword: string; excerpt: string }>) ?? [];
    const lines = [
      `스크래핑 완료 — 추출된 스니펫: ${snippets.length}개`,
      keywords.length > 0 ? `키워드: ${keywords.join(", ")}` : null,
      savedFile,
      "",
      ...snippets.map(
        (s, i) => `[${i + 1}] ${s.url}\n     키워드: ${s.keyword}\n     발췌: ${s.excerpt}`
      ),
    ].filter((l) => l !== null);
    output = lines.join("\n") || "(추출된 내용이 없습니다.)";
  }

  return NextResponse.json({ output });
}
