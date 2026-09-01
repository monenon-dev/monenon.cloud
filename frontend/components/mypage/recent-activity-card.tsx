"use client";

import Link from "next/link";
import { Bot } from "lucide-react";

import { AgentHistoryStatusDot } from "@/components/agent-history/agent-history-status-badge";
import { mypageCardClass } from "@/components/mypage/mypage-sidebar-layout";
import { useRecentAgentHistory } from "@/hooks/use-recent-agent-history";
import { formatRelativeTime } from "@/lib/format-relative-time";
import type { AgentHistoryLog } from "@/lib/agent-history/types";
import { routes } from "@/lib/routes";

function RecentActivitySkeleton() {
  return (
    <ul className="mt-4 space-y-3" aria-hidden>
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="flex gap-3 border-b border-white/5 pb-3 last:border-0 last:pb-0">
          <div className="mt-1.5 size-2 shrink-0 animate-pulse rounded-full bg-white/10" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-2/5 animate-pulse rounded bg-white/10" />
            <div className="h-3 w-4/5 animate-pulse rounded bg-white/[0.06]" />
          </div>
          <div className="h-3 w-12 shrink-0 animate-pulse rounded bg-white/[0.06]" />
        </li>
      ))}
    </ul>
  );
}

function RecentActivityRow({ log }: { log: AgentHistoryLog }) {
  return (
    <li className="flex gap-2.5 border-b border-white/5 py-2.5 first:pt-0 last:border-0 last:pb-0">
      <AgentHistoryStatusDot status={log.status} variant="inline" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="truncate text-xs font-medium text-indigo-100">
            {log.agentName}
            <span className="mx-1 text-indigo-300/40">·</span>
            <span className="font-mono text-indigo-200/80">{log.tool}</span>
          </p>
          <time
            className="shrink-0 text-[11px] text-[var(--moneo-muted)]"
            dateTime={log.timestamp}
          >
            {formatRelativeTime(log.timestamp)}
          </time>
        </div>
        <p className="mt-0.5 line-clamp-1 text-xs text-[var(--moneo-muted)]">{log.prompt}</p>
      </div>
    </li>
  );
}

export function RecentActivityCard() {
  const { logs, loading, error } = useRecentAgentHistory();

  return (
    <section className={mypageCardClass} aria-label="최근 활동">
      <h3 className="text-base font-semibold text-white">최근 활동</h3>

      {loading ? (
        <RecentActivitySkeleton />
      ) : error ? (
        <p className="mt-4 text-sm text-red-300/90">{error}</p>
      ) : logs.length === 0 ? (
        <div className="mt-4 text-center">
          <p className="text-sm text-[var(--moneo-muted)]">
            아직 활동 기록이 없어요. 에이전트와 대화를 시작해보세요.
          </p>
          <Link
            href={routes.lifestyle.chats}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] transition-colors hover:bg-indigo-400"
          >
            <Bot size={16} />
            에이전트 채팅 시작하기
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-3">
            {logs.map((log) => (
              <RecentActivityRow key={log.id} log={log} />
            ))}
          </ul>
          <Link
            href={routes.agent.history}
            className="mt-4 inline-flex text-sm font-medium text-indigo-400 transition-colors hover:text-indigo-300"
          >
            전체 히스토리 보기 →
          </Link>
        </>
      )}
    </section>
  );
}
