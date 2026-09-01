"use client";

import { memo } from "react";
import type { AgentHistoryLog } from "@/lib/agent-history/types";
import type { AgentHistoryLiveHighlights } from "@/hooks/use-agent-history-live";
import { AgentHistoryStatusBadge } from "@/components/agent-history/agent-history-status-badge";

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
  row: AgentHistoryLog;
  highlights: AgentHistoryLiveHighlights;
};

export const AgentHistoryTableRow = memo(function AgentHistoryTableRow({
  row,
  highlights,
}: Props) {
  const isNew = highlights.isNew(row.id);
  const statusChanged = highlights.isStatusChanged(row.id);

  return (
    <tr
      className={`border-t border-white/5 transition-[background-color,box-shadow] duration-300 hover:bg-white/[0.04] ${
        isNew ? "agent-history-row-enter agent-history-row-glow" : ""
      }`}
    >
      <td className="whitespace-nowrap px-3 py-2.5 text-indigo-200/55">
        {formatTime(row.timestamp)}
      </td>
      <td className="px-3 py-2.5 text-indigo-100">{row.agentName}</td>
      <td className="px-3 py-2.5 text-indigo-200">{row.tool}</td>
      <td className="px-3 py-2.5">
        <AgentHistoryStatusBadge
          status={row.status}
          animate={statusChanged}
        />
      </td>
      <td className="px-3 py-2.5 text-indigo-200/80">
        {formatDuration(row.durationMs)}
      </td>
      <td className="px-3 py-2.5 text-indigo-200/80">{row.tokens}</td>
    </tr>
  );
});
