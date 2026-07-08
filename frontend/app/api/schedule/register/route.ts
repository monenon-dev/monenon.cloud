import { NextResponse } from "next/server";

import type { CalendarEventDraft } from "@/lib/schedule-types";

const DEFAULT_WEBHOOK_URL = "http://localhost:5678/webhook/create-calendar-event";

export async function POST(request: Request) {
  const webhookUrl = process.env.N8N_SCHEDULE_WEBHOOK_URL?.trim() || DEFAULT_WEBHOOK_URL;

  let body: Partial<CalendarEventDraft>;
  try {
    body = (await request.json()) as Partial<CalendarEventDraft>;
  } catch {
    return NextResponse.json({ detail: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const start = String(body.start ?? "").trim();
  const end = String(body.end ?? "").trim();
  const description = String(body.description ?? "").trim();
  const location = String(body.location ?? "").trim();

  if (!title) {
    return NextResponse.json({ detail: "일정 제목이 없습니다." }, { status: 400 });
  }
  if (!start || !end) {
    return NextResponse.json({ detail: "시작·종료 시각이 필요합니다." }, { status: 400 });
  }

  try {
    const n8nResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, start, end, description, location }),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text().catch(() => "");
      return NextResponse.json(
        {
          detail:
            errorText ||
            `n8n 웹훅 호출에 실패했습니다. (${n8nResponse.status}) Google Calendar 워크플로가 활성화되어 있는지 확인하세요.`,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Google Calendar에 일정 등록 요청이 완료되었습니다.",
    });
  } catch {
    return NextResponse.json(
      {
        detail:
          "n8n에 연결할 수 없습니다. Docker로 n8n(포트 5678)이 실행 중인지, N8N_SCHEDULE_WEBHOOK_URL이 올바른지 확인하세요.",
      },
      { status: 502 },
    );
  }
}
