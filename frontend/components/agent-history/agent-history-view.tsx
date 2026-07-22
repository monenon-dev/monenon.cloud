"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AgentHistoryTable } from "@/components/agent-history/agent-history-table";
import { AgentHistoryTimeline } from "@/components/agent-history/agent-history-timeline";
import { AgentHistorySyncIndicator } from "@/components/agent-history/agent-history-sync-indicator";
import { AGENT_HISTORY_TIMELINE_LIMIT } from "@/lib/agent-history/constants";
import { useAgentHistoryLive } from "@/hooks/use-agent-history-live";
import { routes } from "@/lib/routes";

export function AgentHistoryView() {
  const { logs, meta, highlights, loadMoreOlder } = useAgentHistoryLive();
  const timelineLogs = logs.slice(0, AGENT_HISTORY_TIMELINE_LIMIT);

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
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-white">Agent 히스토리</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <p className="truncate font-mono text-[10px] text-indigo-300/55">
                timeline · audit log
              </p>
              {!meta.loading ? (
                <AgentHistorySyncIndicator
                  pollingIntervalMs={meta.pollingIntervalMs}
                  isPolling={meta.isPolling}
                  error={meta.error}
                />
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        {meta.loading ? (
          <p className="font-mono text-sm text-indigo-200/50">로그를 불러오는 중…</p>
        ) : meta.error && logs.length === 0 ? (
          <p className="font-mono text-sm text-rose-300/80" role="alert">
            {meta.error}
          </p>
        ) : (
          <>
            <AgentHistoryTimeline logs={timelineLogs} highlights={highlights} />
            <AgentHistoryTable
              logs={logs}
              highlights={highlights}
              totalCount={meta.totalCount}
              hasMoreOlder={meta.hasMoreOlder}
              loadingMore={meta.loadingMore}
              onLoadMoreOlder={loadMoreOlder}
            />
          </>
        )}
      </main>
    </div>
  );
}
