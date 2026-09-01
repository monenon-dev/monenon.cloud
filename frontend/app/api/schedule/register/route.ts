import { NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/api-base";
import type { CalendarEventDraft } from "@/lib/schedule-types";

const DEFAULT_WEBHOOK_URL = "http://localhost:5678/webhook/create-calendar-event";

type RegisterBody = Partial<CalendarEventDraft> & {
  user_id?: number;
  confirm_overlap?: boolean;
};

export async function POST(request: Request) {
  const webhookUrl = process.env.N8N_SCHEDULE_WEBHOOK_URL?.trim() || DEFAULT_WEBHOOK_URL;

  let body: RegisterBody;
  try {
    body = (await request.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ detail: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  const start = String(body.start ?? "").trim();
  const end = String(body.end ?? "").trim();
  const description = String(body.description ?? "").trim();
  const location = String(body.location ?? "").trim();
  const userId = typeof body.user_id === "number" ? body.user_id : Number(body.user_id);
  const confirmOverlap = Boolean(body.confirm_overlap);

  if (!title) {
    return NextResponse.json({ detail: "일정 제목이 없습니다." }, { status: 400 });
  }
  if (!start || !end) {
    return NextResponse.json({ detail: "시작·종료 시각이 필요합니다." }, { status: 400 });
  }

  let kakao: Record<string, unknown> | null = null;
  if (Number.isFinite(userId) && userId > 0) {
    try {
      const kakaoRes = await fetch(`${getApiBaseUrl()}/calendar/kakao/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          title,
          start,
          end,
          description,
          location,
          confirm_overlap: confirmOverlap,
        }),
      });
      kakao = (await kakaoRes.json().catch(() => ({}))) as Record<string, unknown>;
      if (kakaoRes.status === 403) {
        return NextResponse.json(
          {
            detail:
              typeof kakao.detail === "string"
                ? kakao.detail
                : "톡캘린더 동의가 필요합니다. 마이페이지에서 연동을 켜 주세요.",
            kakao,
          },
          { status: 403 }
        );
      }
      if (kakao.needs_confirm) {
        return NextResponse.json({
          ok: false,
          needs_confirm: true,
          conflicts: kakao.conflicts,
          message: kakao.message,
          kakao,
        });
      }
    } catch {
      kakao = { skipped: true, reason: "api-unreachable" };
    }
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
        { status: 502 }
      );
    }

    const message =
      kakao && kakao.ok
        ? "일정이 등록되었고 톡캘린더에도 반영되었습니다."
        : "일정이 등록되었습니다.";

    return NextResponse.json({
      ok: true,
      message,
      kakao,
    });
  } catch {
    return NextResponse.json(
      {
        detail:
          "n8n에 연결할 수 없습니다. Docker로 n8n(포트 5678)이 실행 중인지, N8N_SCHEDULE_WEBHOOK_URL이 올바른지 확인하세요.",
      },
      { status: 502 }
    );
  }
}
