/** 채팅 저장 후 대시보드·히스토리가 즉시 다시 불러오도록 */
export const AGENT_ACTIVITY_UPDATED_EVENT = "moneo:agent-activity-updated";

export function dispatchAgentActivityUpdated(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AGENT_ACTIVITY_UPDATED_EVENT));
}
