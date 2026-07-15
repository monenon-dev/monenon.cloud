"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AgentHistoryTable } from "@/components/agent-history/agent-history-table";
import { AgentHistoryTimeline } from "@/components/agent-history/agent-history-timeline";
import { fetchAgentHistoryLogs } from "@/lib/agent-history/mock-data";
import type { AgentHistoryLog } from "@/lib/agent-history/types";
import { routes } from "@/lib/routes";

const TIMELINE_LIMIT = 10;

export function AgentHistoryView() {
  const [ui, setUi] = useState({
    logs: [] as AgentHistoryLog[],
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const logs = await fetchAgentHistoryLogs();
        if (!cancelled) setUi({ logs, loading: false });
      } catch {
        if (!cancelled) setUi({ logs: [], loading: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const timelineLogs = ui.logs.slice(0, TIMELINE_LIMIT);

  return (
    <div className="relative min-h-dvh moneo-grid-bg text-[var(--moneo-text)]">
      <div className="moneo-noise pointer-events-none absolute inset-0 -z-10" aria-hidden />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[rgba(10,10,15,0.85)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Link
            href={routes.home}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-indigo-100/80 transition-colors hover:border-white/20 hover:bg-white/[0.04]"
          >
            <ArrowLeft size={14} aria-hidden />
            홈
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-white">Agent 히스토리</h1>
            <p className="truncate font-mono text-[10px] text-indigo-300/55">
              timeline · audit log
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {ui.loading ? (
          <p className="font-mono text-sm text-indigo-200/50">로그를 불러오는 중…</p>
        ) : (
          <>
            <AgentHistoryTimeline logs={timelineLogs} />
            <AgentHistoryTable logs={ui.logs} />
          </>
        )}
      </main>
    </div>
  );
}
