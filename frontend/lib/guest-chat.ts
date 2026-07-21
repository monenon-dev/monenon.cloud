import { getApiBaseUrl } from "@/lib/api-base";

/** 게스트(비로그인) 일일 메시지 한도 — 백엔드 `guest_chat_limit.GUEST_DAILY_LIMIT` 와 맞춤 */
export const GUEST_DAILY_LIMIT = 20;

const STORAGE_PREFIX = "moneo_guest_chat_usage_";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function storageKey(): string {
  return `${STORAGE_PREFIX}${todayKey()}`;
}

export function getGuestUsageCount(): number {
  if (typeof window === "undefined") return 0;
  const raw = localStorage.getItem(storageKey());
  const n = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

export function setGuestUsageCount(count: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(), String(Math.max(0, count)));
}

export function getGuestRemaining(): number {
  return Math.max(0, GUEST_DAILY_LIMIT - getGuestUsageCount());
}

export function canGuestSend(): boolean {
  return getGuestRemaining() > 0;
}

export type GuestChatResult = {
  reply: string;
  model?: string;
  remaining: number;
  limit: number;
};

export async function callGuestChat(message: string): Promise<GuestChatResult> {
  if (!canGuestSend()) {
    throw new Error(
      `오늘 게스트 이용 한도(${GUEST_DAILY_LIMIT}회)를 모두 사용했습니다. 로그인 후 계속 이용해 주세요.`
    );
  }

  const base = getApiBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/chat/guest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  const raw: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof raw === "object" &&
      raw !== null &&
      "detail" in raw &&
      typeof (raw as { detail: unknown }).detail === "string"
        ? (raw as { detail: string }).detail
        : `요청 실패 (${res.status})`;
    throw new Error(detail);
  }

  if (typeof raw !== "object" || raw === null || typeof (raw as { reply?: unknown }).reply !== "string") {
    throw new Error("응답에 reply가 없습니다.");
  }

  const data = raw as {
    reply: string;
    model?: string;
    guest_used?: number;
    guest_limit?: number;
    guest_remaining?: number;
  };

  const limit = typeof data.guest_limit === "number" ? data.guest_limit : GUEST_DAILY_LIMIT;
  const remaining =
    typeof data.guest_remaining === "number"
      ? data.guest_remaining
      : typeof data.guest_used === "number"
        ? Math.max(0, limit - data.guest_used)
        : getGuestRemaining();

  if (typeof data.guest_used === "number") {
    setGuestUsageCount(data.guest_used);
  }

  return {
    reply: data.reply,
    model: data.model,
    remaining,
    limit,
  };
}
