import { todaySeoulISO } from "@/lib/seoul-date";

export const HOME_MEETINGS_SAVED_EVENT = "moneo:home-meetings-saved";
const BRIEFING_REFRESH_FLAG = "moneo.home.meetings.briefing_refresh";
const BRIEFING_INJECTED_PREFIX = "moneo.today_briefing_injected";

export function dispatchHomeMeetingsSaved(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(BRIEFING_REFRESH_FLAG, todaySeoulISO());
  window.dispatchEvent(new CustomEvent(HOME_MEETINGS_SAVED_EVENT));
}

export function shouldForceBriefingRefresh(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(BRIEFING_REFRESH_FLAG) === todaySeoulISO();
}

export function clearHomeMeetingsBriefingRefreshFlag(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(BRIEFING_REFRESH_FLAG);
}

/** 홈 미팅 저장 후 채팅 브리핑 자동 주입을 다시 허용한다. */
export function clearBriefingInjectedForUser(userId: number, day = todaySeoulISO()): void {
  if (typeof window === "undefined") return;
  const prefix = `${BRIEFING_INJECTED_PREFIX}.${userId}.${day}.`;
  for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(prefix)) sessionStorage.removeItem(key);
  }
}

export function briefingInjectStorageKey(
  userId: number,
  sessionId: number,
  day = todaySeoulISO()
): string {
  return `${BRIEFING_INJECTED_PREFIX}.${userId}.${day}.${sessionId}`;
}
