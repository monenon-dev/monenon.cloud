import { NextResponse } from "next/server";

import { readInboxStore, upsertInboxMessages } from "@/lib/mail-inbox-store";
import { normalizeInboxMessage } from "@/lib/mail-inbox-server";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const items = Array.isArray(body) ? body : [body];
  const messages = items
    .map((item, index) => normalizeInboxMessage(item, index))
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (messages.length === 0) {
    return NextResponse.json({ detail: "저장할 메일 정보가 없습니다." }, { status: 400 });
  }

  const stored = await upsertInboxMessages(messages);
  return NextResponse.json({ ok: true, count: stored.length });
}

export async function GET() {
  const messages = await readInboxStore();
  return NextResponse.json({ messages, count: messages.length });
}
