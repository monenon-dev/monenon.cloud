import { formatApiError } from "@/lib/format-api-error";
import type { InboxMessage } from "@/lib/mail-inbox-types";

export async function syncMailInbox(allowlist: string[]): Promise<{
  messages: InboxMessage[];
  filteredCount: number;
  totalCount: number;
}> {
  const res = await fetch("/api/mail/inbox/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ allowlist }),
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(formatApiError(data, "수신함을 불러오지 못했습니다."));
  }

  return data as { messages: InboxMessage[]; filteredCount: number; totalCount: number };
}
