/** 추천 태그·홈 진입 채팅 중복 방지 (React Strict Mode 대응) */

let inflightPrompt: string | null = null;

/** `?new=1&nonce=` — remount가 같은 create Promise를 공유 */
const newChatByNonce = new Map<string, Promise<unknown>>();

export function tryAcquireStarterSend(prompt: string): boolean {
  if (inflightPrompt === prompt) return false;
  inflightPrompt = prompt;
  return true;
}

export function releaseStarterSend(prompt: string): void {
  if (inflightPrompt === prompt) inflightPrompt = null;
}

/**
 * nonce당 factory를 한 번만 실행하고, 이후 호출은 같은 Promise를 반환한다.
 * Strict Mode unmount/remount에서도 세션이 두 번 생기지 않는다.
 */
export function shareNewChatByNonce<T>(
  nonce: string,
  factory: () => Promise<T>
): Promise<T> {
  const key = nonce.trim();
  if (!key) {
    return factory();
  }

  const existing = newChatByNonce.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const pending = factory().catch((err) => {
    newChatByNonce.delete(key);
    throw err;
  });

  newChatByNonce.set(key, pending);
  return pending as Promise<T>;
}

export function readClaimedSessionIdForNonce(nonce: string): number | null {
  const key = nonce.trim();
  if (!key || typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`moneo.chat_new_session.${key}`);
    if (!raw) return null;
    const id = Number(raw);
    return Number.isFinite(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

export function claimSessionIdForNonce(nonce: string, sessionId: number): void {
  const key = nonce.trim();
  if (!key || !Number.isFinite(sessionId)) return;
  try {
    sessionStorage?.setItem(`moneo.chat_new_session.${key}`, String(sessionId));
  } catch {
    /* ignore */
  }
}
