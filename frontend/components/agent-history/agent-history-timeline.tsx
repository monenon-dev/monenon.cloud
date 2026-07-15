"use client";

import { useState } from "react";
import type { AgentHistoryLog, AgentHistoryStatus } from "@/lib/agent-history/types";

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

function statusDotClass(status: AgentHistoryStatus): string {
  if (status === "success") return "bg-emerald-400";
  if (status === "running") return "bg-sky-400 animate-pulse";
  return "bg-rose-400";
}

function statusLabel(status: AgentHistoryStatus): string {
  if (status === "success") return "성공";
  if (status === "running") return "진행중";
  return "실패";
}

type Props = {
  logs: AgentHistoryLog[];
};

export function AgentHistoryTimeline({ logs }: Props) {
  const [ui, setUi] = useState({ openId: null as string | null });

  return (
    <section aria-label="최근 활동">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-indigo-300/70">
        최근 활동
      </h2>
      <ol className="relative mt-5 space-y-0 border-l border-white/10 ml-2.5">
        {logs.map((log) => {
          const open = ui.openId === log.id;
          return (
            <li key={log.id} className="relative pl-6 pb-5 last:pb-0">
              <span
                className={`absolute -left-[5px] top-1.5 size-2.5 rounded-full ring-4 ring-[var(--moneo-bg)] ${statusDotClass(log.status)}`}
                aria-hidden
              />
              <button
                type="button"
                onClick={() =>
                  setUi((prev) => ({
                    openId: prev.openId === log.id ? null : log.id,
                  }))
                }
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-left transition-[border-color,background-color] duration-200 hover:border-white/18 hover:bg-white/[0.05]"
                aria-expanded={open}
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px]">
                  <span className="text-indigo-200/50">{formatTime(log.timestamp)}</span>
                  <span className="text-indigo-100">{log.agentName}</span>
                  <span className="rounded border border-indigo-400/25 bg-indigo-500/10 px-1.5 py-0.5 text-indigo-200">
                    {log.tool}
                  </span>
                  <span
                    className={
                      log.status === "success"
                        ? "text-emerald-400"
                        : log.status === "running"
                          ? "text-sky-400"
                          : "text-rose-400"
                    }
                  >
                    {statusLabel(log.status)}
                  </span>
                </div>

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
        })}
      </ol>
    </section>
  );
}
