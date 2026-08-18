export type AgentAvatarState = "idle" | "working" | "complete";

export const AGENT_AVATAR_ASSETS: Record<AgentAvatarState, string> = {
  idle: "/assets/agent-idle.png",
  working: "/assets/agent-working.png",
  complete: "/assets/agent-complete.png",
};

export const AGENT_AVATAR_ALT = "Moneo AI 에이전트";
