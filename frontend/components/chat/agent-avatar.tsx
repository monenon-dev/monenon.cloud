"use client";

import {
  AGENT_AVATAR_ALT,
  AGENT_AVATAR_ASSETS,
  type AgentAvatarState,
} from "@/lib/agent-avatar";

type AgentAvatarSize = "sm" | "lg";

const SIZE_PX: Record<AgentAvatarSize, number> = {
  sm: 36,
  lg: 140,
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
      : size === "sm" && state === "working"
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
      className={`shrink-0 select-none object-contain ${animationClass} ${className}`}
    />
  );
}
