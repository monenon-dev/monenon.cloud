"use client";

import { memo, useState } from "react";
import type { AgentHistoryLog } from "@/lib/agent-history/types";
import type { AgentHistoryLiveHighlights } from "@/hooks/use-agent-history-live";
import {
  AgentHistoryStatusBadge,
  AgentHistoryStatusDot,
} from "@/components/agent-history/agent-history-status-badge";

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

type Props = {
  log: AgentHistoryLog;
  highlights: AgentHistoryLiveHighlights;
  open: boolean;
  onToggle: () => void;
};

export const AgentHistoryTimelineItem = memo(function AgentHistoryTimelineItem({
  log,
  highlights,
  open,
  onToggle,
}: Props) {
  const isNew = highlights.isNew(log.id);
  const statusChanged = highlights.isStatusChanged(log.id);

  return (
    <li
      className={`relative pl-6 pb-5 last:pb-0 ${
        isNew ? "agent-history-row-enter" : ""
      }`}
    >
      <AgentHistoryStatusDot status={log.status} />
      <button
        type="button"
        onClick={onToggle}
        className={`w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-left transition-[border-color,background-color,box-shadow] duration-300 hover:border-white/18 hover:bg-white/[0.05] ${
          isNew ? "agent-history-row-glow" : ""
        }`}
        aria-expanded={open}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
          <span className="text-indigo-200/50">{formatTime(log.timestamp)}</span>
          <span className="text-indigo-100">{log.agentName}</span>
          <span className="rounded border border-indigo-400/25 bg-indigo-500/10 px-1.5 py-0.5 text-indigo-200">
            {log.tool}
          </span>
          <AgentHistoryStatusBadge
            status={log.status}
            variant="inline"
            animate={statusChanged}
          />
        </div>
        <p className="mt-1.5 line-clamp-1 text-xs text-[var(--moneo-muted)]">
          {log.prompt}
        </p>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
            open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <dl className="space-y-2 border-t border-white/10 pt-3 font-mono text-[11px] text-[var(--moneo-muted)]">
              <div>
                <dt className="text-indigo-300/60">입력 프롬프트</dt>
                <dd className="mt-0.5 text-indigo-100/90">{log.prompt}</dd>
              </div>
              <div>
                <dt className="text-indigo-300/60">응답 요약</dt>
                <dd className="mt-0.5 text-indigo-100/90">{log.responseSummary}</dd>
              </div>
              <div>
                <dt className="text-indigo-300/60">Tool 파라미터</dt>
                <dd className="mt-0.5 break-all text-indigo-100/80">
                  {JSON.stringify(log.toolParams)}
                </dd>
              </div>
              <div className="flex flex-wrap gap-4">
                <div>
                  <dt className="text-indigo-300/60">소요 시간</dt>
                  <dd className="mt-0.5 text-indigo-100/90">
                    {formatDuration(log.durationMs)}
                  </dd>
                </div>
                <div>
                  <dt className="text-indigo-300/60">토큰</dt>
                  <dd className="mt-0.5 text-indigo-100/90">{log.tokens}</dd>
                </div>
              </div>
            </dl>
          </div>
        </div>
      </button>
    </li>
  );
});

/** Wrapper keeps accordion open state outside memo boundary per row id. */
export function AgentHistoryTimelineItemControlled({
  log,
  highlights,
}: {
  log: AgentHistoryLog;
  highlights: AgentHistoryLiveHighlights;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AgentHistoryTimelineItem
      log={log}
      highlights={highlights}
      open={open}
      onToggle={() => setOpen((v) => !v)}
    />
  );
}
