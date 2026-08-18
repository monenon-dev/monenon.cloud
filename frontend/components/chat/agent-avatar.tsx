"use client";

import {
  AGENT_AVATAR_ALT,
  AGENT_AVATAR_ASSETS,
  type AgentAvatarState,
} from "@/lib/agent-avatar";

type AgentAvatarSize = "sm" | "lg";

const SIZE_PX: Record<AgentAvatarSize, number> = {
  sm: 44,
  lg: 140,
};

const GLOW_CLASS: Record<AgentAvatarState, string> = {
  idle: "drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]",
  working: "drop-shadow-[0_0_12px_rgba(99,102,241,0.75)]",
  complete: "drop-shadow-[0_0_14px_rgba(52,211,153,0.65)]",
};

type AgentAvatarProps = {
  state?: AgentAvatarState;
  size?: AgentAvatarSize;
  className?: string;
};

export function AgentAvatar({
  state = "idle",
  size = "sm",
  className = "",
}: AgentAvatarProps) {
  const px = SIZE_PX[size];
  const animationClass =
    size === "lg" && state === "idle"
      ? "animate-agent-breathe"
      : state === "working"
        ? "animate-agent-spin"
        : "";

  return (
    // eslint-disable-next-line @next/next/no-img-element -- public PNG avatars with state swap
    <img
      src={AGENT_AVATAR_ASSETS[state]}
      alt={AGENT_AVATAR_ALT}
      width={px}
      height={px}
      draggable={false}
      style={{ width: px, height: px }}
      className={`max-w-none shrink-0 select-none object-contain ${GLOW_CLASS[state]} ${animationClass} ${className}`}
    />
  );
}
