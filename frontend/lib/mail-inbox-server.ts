import type { InboxMessage } from "@/lib/mail-inbox-types";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000").replace(
  /\/$/,
  "",
);

const DEFAULT_INBOX_WEBHOOK_URL = "http://localhost:5678/webhook/mail-inbox";

export function normalizeSenderEmail(from: string): string {
  const angle = from.match(/<([^>]+)>/);
  if (angle?.[1]) return angle[1].trim().toLowerCase();
  const plain = from.match(/([^\s<>]+@[^\s<>]+)/);
  return (plain?.[1] ?? from).trim().toLowerCase();
}

export function normalizeInboxMessage(item: unknown, index: number): InboxMessage | null {
  if (typeof item !== "object" || item === null) return null;
  const row = item as Record<string, unknown>;
  const from = String(row.from ?? row.sender ?? row.email ?? "").trim();
  if (!from) return null;

  const receivedAt =
    String(row.receivedAt ?? row.date ?? row.internalDate ?? "").trim() || new Date().toISOString();
  const id = String(row.id ?? row.messageId ?? `${from}-${receivedAt}-${index}`).trim();

  return {
    id,
    from,
    subject: String(row.subject ?? "").trim() || "(제목 없음)",
    snippet: String(row.snippet ?? row.body ?? row.text ?? row.message ?? "").trim(),
    receivedAt,
  };
}

export function parseInboxPayload(raw: unknown): InboxMessage[] {
  if (Array.isArray(raw)) {
    return raw.map((item, index) => normalizeInboxMessage(item, index)).filter((m): m is InboxMessage => m !== null);
  }
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    const list = obj.emails ?? obj.messages ?? obj.data ?? obj.items;
    if (Array.isArray(list)) {
      return list
        .map((item, index) => normalizeInboxMessage(item, index))
        .filter((m): m is InboxMessage => m !== null);
    }
  }
  return [];
}

export async function fetchInboxFromN8n(): Promise<InboxMessage[]> {
  const webhookUrl = process.env.N8N_MAIL_INBOX_WEBHOOK_URL?.trim() || DEFAULT_INBOX_WEBHOOK_URL;
  const response = await fetch(webhookUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const raw: unknown = await response.json().catch(() => null);
  return parseInboxPayload(raw);
}

function extractJsonArray(text: string): InboxMessage[] | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed;

  try {
    const parsed = JSON.parse(candidate) as unknown;
    return parseInboxPayload(parsed);
  } catch {
    return null;
  }
}

export async function filterInboxWithGemini(
  messages: InboxMessage[],
  allowlist: string[],
): Promise<InboxMessage[]> {
  const allowed = [...new Set(allowlist.map((email) => email.trim().toLowerCase()).filter(Boolean))];
  if (allowed.length === 0) return [];
  if (messages.length === 0) return [];

  const locallyAllowed = messages.filter((msg) => allowed.includes(normalizeSenderEmail(msg.from)));
  if (locallyAllowed.length === messages.length) {
    return locallyAllowed;
  }

  const prompt = [
    "당신은 Gmail 수신함 필터입니다.",
    `허용된 발신자 이메일만 남기세요: ${allowed.join(", ")}`,
    "발신자 주소는 From 필드에서 이메일만 추출해 정확히 비교하세요.",
    "허용되지 않은 메일은 제거하세요.",
    "반드시 JSON 배열만 출력하세요. 다른 설명은 금지합니다.",
    '[{"id":"...","from":"...","subject":"...","snippet":"...","receivedAt":"..."}]',
    "",
    "수신 메일 목록:",
    JSON.stringify(messages),
  ].join("\n");

  const chatResponse = await fetch(`${API_BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: prompt }),
  });

  const chatData = (await chatResponse.json().catch(() => ({}))) as {
    reply?: string;
    detail?: string;
  };

  if (!chatResponse.ok) {
    throw new Error(chatData.detail ?? `Gemini 필터링에 실패했습니다. (${chatResponse.status})`);
  }

  const filtered = extractJsonArray(String(chatData.reply ?? ""));
  if (!filtered) {
    return locallyAllowed;
  }

  const allowedIds = new Set(filtered.map((msg) => msg.id));
  return messages.filter((msg) => allowedIds.has(msg.id) && allowed.includes(normalizeSenderEmail(msg.from)));
}
