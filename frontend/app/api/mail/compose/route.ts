import { NextResponse } from "next/server";

type ComposeRequestBody = {
  prompt?: string;
};

type ComposedMail = {
  to: string;
  subject: string;
  message: string;
};

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);

function extractJsonObject(text: string): ComposedMail | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    const parsed = JSON.parse(candidate) as Partial<ComposedMail>;
    const to = String(parsed.to ?? "").trim();
    const subject = String(parsed.subject ?? "").trim();
    const message = String(parsed.message ?? "").trim();
    if (!to || !message) return null;
    return { to, subject: subject || "Monenon 메일", message };
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
    return NextResponse.json({ detail: "메일 주소와 대략적인 내용을 입력하세요." }, { status: 400 });
  }

  const geminiPrompt = [
    "당신은 한국어 비즈니스 메일 작성 도우미입니다.",
    "사용자 입력에서 받는 사람 이메일과 내려는 요지를 파악해 완성된 메일을 작성하세요.",
    "반드시 아래 JSON만 출력하세요. 다른 설명·마크다운은 넣지 마세요.",
    '{"to":"받는사람@example.com","subject":"제목","message":"본문"}',
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
        { detail: "Gemini가 메일 형식으로 응답하지 못했습니다. 이메일 주소를 포함해 다시 입력해 주세요." },
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
