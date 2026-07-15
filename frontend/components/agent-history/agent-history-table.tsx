"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import {
  AGENT_HISTORY_FILTER_AGENTS,
  AGENT_HISTORY_FILTER_STATUSES,
} from "@/lib/agent-history/mock-data";
import type {
  AgentHistoryLog,
  AgentHistoryStatus,
  AgentName,
} from "@/lib/agent-history/types";

type SortKey = "timestamp" | "durationMs" | "tokens" | "agentName" | "tool" | "status";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 20;

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

function statusBadge(status: AgentHistoryStatus) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center rounded border border-emerald-400/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-300">
        성공
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-sky-400/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-300">
        <span className="size-1.5 rounded-full bg-sky-400 animate-pulse" />
        진행중
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded border border-rose-400/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] text-rose-300">
      실패
    </span>
  );
}

type Props = {
  logs: AgentHistoryLog[];
};

export function AgentHistoryTable({ logs }: Props) {
  const [ui, setUi] = useState({
    agent: "all" as AgentName | "all",
    status: "all" as AgentHistoryStatus | "all",
    query: "",
    sortKey: "timestamp" as SortKey,
    sortDir: "desc" as SortDir,
    visible: PAGE_SIZE,
  });

  const patch = (p: Partial<typeof ui>) =>
    setUi((prev) => ({ ...prev, ...p }));

  const filtered = useMemo(() => {
    let rows = [...logs];
    if (ui.agent !== "all") {
      rows = rows.filter((r) => r.agentName === ui.agent);
    }
    if (ui.status !== "all") {
      rows = rows.filter((r) => r.status === ui.status);
    }
    const q = ui.query.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => r.tool.toLowerCase().includes(q));
    }
    rows.sort((a, b) => {
      const dir = ui.sortDir === "asc" ? 1 : -1;
      const av = a[ui.sortKey];
      const bv = b[ui.sortKey];
      if (ui.sortKey === "timestamp") {
        return (new Date(String(av)).getTime() - new Date(String(bv)).getTime()) * dir;
      }
      if (typeof av === "number" && typeof bv === "number") {
        return (av - bv) * dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });
    return rows;
  }, [logs, ui.agent, ui.status, ui.query, ui.sortKey, ui.sortDir]);

  const visibleRows = filtered.slice(0, ui.visible);
  const canLoadMore = ui.visible < filtered.length;

  const toggleSort = (key: SortKey) => {
    if (ui.sortKey === key) {
      patch({ sortDir: ui.sortDir === "asc" ? "desc" : "asc" });
      return;
    }
    patch({
      sortKey: key,
      sortDir: key === "timestamp" || key === "durationMs" || key === "tokens" ? "desc" : "asc",
    });
  };

  const th = (key: SortKey, label: string) => (
    <th scope="col" className="px-3 py-2.5 text-left font-medium text-indigo-300/70">
      <button
        type="button"
        onClick={() => toggleSort(key)}
        className="inline-flex items-center gap-1 hover:text-indigo-200"
      >
        {label}
        {ui.sortKey === key ? (
          <ChevronDown
            size={12}
            className={ui.sortDir === "asc" ? "rotate-180" : ""}
            aria-hidden
          />
        ) : null}
      </button>
    </th>
  );

  return (
    <section aria-label="전체 로그">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-indigo-300/70">
          전체 로그
        </h2>
        <p className="font-mono text-[11px] text-indigo-200/45">
          {filtered.length} / {logs.length} events
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 font-mono text-[10px] text-indigo-300/60 sm:max-w-[14rem]">
          Agent
          <select
            value={ui.agent}
            onChange={(e) =>
              patch({
                agent: e.target.value as AgentName | "all",
                visible: PAGE_SIZE,
              })
            }
            className="rounded-lg border border-white/10 bg-[#121218] px-2.5 py-2 text-xs text-indigo-100 outline-none focus:border-indigo-400/40"
          >
            <option value="all">전체</option>
            {AGENT_HISTORY_FILTER_AGENTS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[8rem] flex-1 flex-col gap-1 font-mono text-[10px] text-indigo-300/60 sm:max-w-[11rem]">
          상태
          <select
            value={ui.status}
            onChange={(e) =>
              patch({
                status: e.target.value as AgentHistoryStatus | "all",
                visible: PAGE_SIZE,
              })
            }
            className="rounded-lg border border-white/10 bg-[#121218] px-2.5 py-2 text-xs text-indigo-100 outline-none focus:border-indigo-400/40"
          >
            {AGENT_HISTORY_FILTER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "전체" : s === "success" ? "성공" : s === "running" ? "진행중" : "실패"}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-[2] flex-col gap-1 font-mono text-[10px] text-indigo-300/60">
          Tool 검색
          <span className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-300/50"
              aria-hidden
            />
            <input
              value={ui.query}
              onChange={(e) => patch({ query: e.target.value, visible: PAGE_SIZE })}
              placeholder="예: docs.search"
              className="w-full rounded-lg border border-white/10 bg-[#121218] py-2 pl-8 pr-2.5 text-xs text-indigo-100 outline-none placeholder:text-indigo-200/30 focus:border-indigo-400/40"
            />
          </span>
        </label>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-[720px] w-full border-collapse font-mono text-[11px]">
          <thead className="bg-white/[0.04]">
            <tr>
              {th("timestamp", "타임스탬프")}
              {th("agentName", "Agent")}
              {th("tool", "Tool")}
              {th("status", "상태")}
              {th("durationMs", "소요시간")}
              {th("tokens", "토큰")}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => (
              <tr
                key={row.id}
                className="border-t border-white/5 transition-colors duration-150 hover:bg-white/[0.04]"
              >
                <td className="whitespace-nowrap px-3 py-2.5 text-indigo-200/55">
                  {formatTime(row.timestamp)}
                </td>
                <td className="px-3 py-2.5 text-indigo-100">{row.agentName}</td>
                <td className="px-3 py-2.5 text-indigo-200">{row.tool}</td>
                <td className="px-3 py-2.5">{statusBadge(row.status)}</td>
                <td className="px-3 py-2.5 text-indigo-200/80">
                  {formatDuration(row.durationMs)}
                </td>
                <td className="px-3 py-2.5 text-indigo-200/80">{row.tokens}</td>
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-8 text-center text-indigo-200/45"
                >
                  조건에 맞는 로그가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {canLoadMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => patch({ visible: ui.visible + PAGE_SIZE })}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-indigo-100 transition-colors hover:border-white/20 hover:bg-white/[0.05]"
          >
            더 보기 ({Math.min(PAGE_SIZE, filtered.length - ui.visible)} / 남은{" "}
            {filtered.length - ui.visible})
          </button>
        </div>
      )}
    </section>
  );
}
