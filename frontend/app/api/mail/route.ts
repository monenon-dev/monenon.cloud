import { NextResponse } from "next/server";

type MailRequestBody = {
  to?: string;
  message?: string;
  subject?: string;
};

const DEFAULT_WEBHOOK_URL = "http://localhost:5678/webhook/send-mail";
const DEFAULT_SUBJECT = "Moneo 메일";

export async function POST(request: Request) {
  const webhookUrl = process.env.N8N_MAIL_WEBHOOK_URL?.trim() || DEFAULT_WEBHOOK_URL;

  let body: MailRequestBody;
  try {
    body = (await request.json()) as MailRequestBody;
  } catch {
    return NextResponse.json({ detail: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const to = String(body.to ?? "").trim();
  const message = String(body.message ?? "").trim();
  const subject = String(body.subject ?? DEFAULT_SUBJECT).trim() || DEFAULT_SUBJECT;

  if (!to) {
    return NextResponse.json({ detail: "받는 사람 메일 주소를 입력하세요." }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ detail: "메일 내용을 입력하세요." }, { status: 400 });
  }

  try {
    const n8nResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, message, subject }),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text().catch(() => "");
      return NextResponse.json(
        {
          detail:
            errorText ||
            `n8n 웹훅 호출에 실패했습니다. (${n8nResponse.status}) 워크플로가 활성화되어 있는지 확인하세요.`,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "메일 전송 요청이 완료되었습니다.",
    });
  } catch {
    return NextResponse.json(
      {
        detail:
          "n8n에 연결할 수 없습니다. Docker로 n8n(포트 5678)이 실행 중인지, N8N_MAIL_WEBHOOK_URL이 올바른지 확인하세요.",
      },
      { status: 502 },
    );
  }
}
