import { NextResponse } from "next/server";

import type { CalendarEventDraft } from "@/lib/schedule-types";

type ComposeRequestBody = {
  prompt?: string;
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);

function extractJsonObject(text: string): CalendarEventDraft | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    const parsed = JSON.parse(candidate) as Partial<CalendarEventDraft>;
    const title = String(parsed.title ?? "").trim();
    const start = String(parsed.start ?? "").trim();
    const end = String(parsed.end ?? "").trim();
    if (!title || !start || !end) return null;
    return {
      title,
      start,
      end,
      description: String(parsed.description ?? "").trim(),
      location: String(parsed.location ?? "").trim(),
    };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: ComposeRequestBody;
  try {
    body = (await request.json()) as ComposeRequestBody;
  } catch {
    return NextResponse.json({ detail: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const prompt = String(body.prompt ?? "").trim();
  if (!prompt) {
    return NextResponse.json({ detail: "등록할 일정을 입력하세요." }, { status: 400 });
  }

  const nowSeoul = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const geminiPrompt = [
    "당신은 Google Calendar 일정 등록 도우미입니다.",
    `현재 시각(서울): ${nowSeoul}`,
    "사용자의 자연어 입력을 파싱해 일정 JSON을 만드세요.",
    "start·end는 ISO 8601 형식(타임존 +09:00)으로 출력하세요.",
    "종료 시각이 없으면 시작 후 1시간으로 설정하세요.",
    "반드시 아래 JSON만 출력하세요. 다른 설명·마크다운은 넣지 마세요.",
    '{"title":"일정 제목","start":"2026-07-02T15:00:00+09:00","end":"2026-07-02T16:00:00+09:00","description":"설명","location":"장소"}',
    "",
    "사용자 입력:",
    prompt,
  ].join("\n");

  try {
    const chatResponse = await fetch(`${API_BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: geminiPrompt }),
    });

    const chatData = (await chatResponse.json().catch(() => ({}))) as {
      reply?: string;
      detail?: string;
    };

    if (!chatResponse.ok) {
      return NextResponse.json(
        { detail: chatData.detail ?? `Gemini 호출에 실패했습니다. (${chatResponse.status})` },
        { status: chatResponse.status === 429 ? 429 : 502 },
      );
    }

    const reply = String(chatData.reply ?? "").trim();
    const composed = extractJsonObject(reply);
    if (!composed) {
      return NextResponse.json(
        { detail: "Gemini가 일정 형식으로 응답하지 못했습니다. 날짜·시간을 포함해 다시 입력해 주세요." },
        { status: 502 },
      );
    }

    return NextResponse.json(composed);
  } catch {
    return NextResponse.json(
      { detail: "백엔드(8000)에 연결할 수 없습니다. FastAPI가 실행 중인지 확인하세요." },
      { status: 502 },
    );
  }
}
