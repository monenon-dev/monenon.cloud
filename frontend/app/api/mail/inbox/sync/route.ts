import { NextResponse } from "next/server";

import { readInboxStore, upsertInboxMessages } from "@/lib/mail-inbox-store";
import { fetchInboxFromN8n, filterInboxWithGemini } from "@/lib/mail-inbox-server";

type SyncRequestBody = {
  allowlist?: string[];
};

export async function POST(request: Request) {
  let body: SyncRequestBody;
  try {
    body = (await request.json()) as SyncRequestBody;
  } catch {
    return NextResponse.json({ detail: "요청 본문이 올바르지 않습니다." }, { status: 400 });
  }

  const allowlist = Array.isArray(body.allowlist)
    ? body.allowlist.map((email) => String(email).trim().toLowerCase()).filter((email) => email.includes("@"))
    : [];

  if (allowlist.length === 0) {
    return NextResponse.json(
      { detail: "허용할 발신자 메일 주소를 먼저 등록하세요." },
      { status: 400 },
    );
  }

  try {
    const fromN8n = await fetchInboxFromN8n();
    const fromStore = await readInboxStore();
    const mergedMap = new Map<string, (typeof fromN8n)[number]>();
    for (const msg of [...fromStore, ...fromN8n]) {
      mergedMap.set(msg.id, msg);
    }
    const allMessages = [...mergedMap.values()];
    if (fromN8n.length > 0) {
      await upsertInboxMessages(fromN8n);
    }

    const filtered = await filterInboxWithGemini(allMessages, allowlist);

    return NextResponse.json({
      messages: filtered,
      filteredCount: filtered.length,
      totalCount: allMessages.length,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "수신함 동기화에 실패했습니다.";
    return NextResponse.json({ detail }, { status: 502 });
  }
}
