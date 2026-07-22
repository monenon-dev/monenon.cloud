"use client";

import type { AgentHistoryStatus } from "@/lib/agent-history/types";

type Props = {
  status: AgentHistoryStatus;
  /** Pulse transition when status just changed. */
  animate?: boolean;
  variant?: "inline" | "badge";
};

const LABEL: Record<AgentHistoryStatus, string> = {
  success: "성공",
  running: "진행중",
  failed: "실패",
};

const BADGE_CLASS: Record<AgentHistoryStatus, string> = {
  success:
    "border-emerald-400/30 bg-emerald-500/10 text-emerald-300",
  running: "border-sky-400/30 bg-sky-500/10 text-sky-300",
  failed: "border-rose-400/30 bg-rose-500/10 text-rose-300",
};

const INLINE_CLASS: Record<AgentHistoryStatus, string> = {
  success: "text-emerald-400",
  running: "text-sky-400",
  failed: "text-rose-400",
};

export function AgentHistoryStatusBadge({
  status,
  animate = false,
  variant = "badge",
}: Props) {
  const transition = animate
    ? "transition-[color,background-color,border-color] duration-500 ease-out"
    : "transition-[color,background-color,border-color] duration-300";

  if (variant === "inline") {
    return (
      <span className={`${INLINE_CLASS[status]} ${transition}`}>
        {LABEL[status]}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] ${BADGE_CLASS[status]} ${transition}`}
    >
      {status === "running" ? (
        <span className="size-1.5 rounded-full bg-sky-400 animate-pulse" aria-hidden />
      ) : null}
      {LABEL[status]}
    </span>
  );
}

export function AgentHistoryStatusDot({
  status,
  variant = "timeline",
}: {
  status: AgentHistoryStatus;
  variant?: "timeline" | "inline";
}) {
  const base =
    status === "success"
      ? "bg-emerald-400"
      : status === "running"
        ? "bg-sky-400 animate-pulse"
        : "bg-rose-400";

  if (variant === "inline") {
    return (
      <span
        className={`mt-1.5 size-2 shrink-0 rounded-full transition-colors duration-500 ease-out ${base}`}
        aria-hidden
      />
    );
  }

  return (
    <span
      className={`absolute -left-[5px] top-1.5 size-2.5 rounded-full ring-4 ring-[var(--moneo-bg)] transition-colors duration-500 ease-out ${base}`}
      aria-hidden
    />
  );
}
