"use client";

import { useEffect, useState } from "react";

import { fetchAgentHistoryLogs } from "@/lib/agent-history/api";
import { DASHBOARD_RECENT_ACTIVITY_LIMIT } from "@/lib/agent-history/constants";
import type { AgentHistoryLog } from "@/lib/agent-history/types";

type RecentAgentHistoryState = {
  logs: AgentHistoryLog[];
  loading: boolean;
  error: string | null;
};

/** 페이지 진입 시 1회 fetch — 폴링 없음 */
export function useRecentAgentHistory(
  limit = DASHBOARD_RECENT_ACTIVITY_LIMIT
): RecentAgentHistoryState {
  const [state, setState] = useState<RecentAgentHistoryState>({
    logs: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetchAgentHistoryLogs({ limit });
        if (cancelled) return;
        setState({
          logs: res.items.slice(0, limit),
          loading: false,
          error: null,
        });
      } catch {
        if (cancelled) return;
        setState({
          logs: [],
          loading: false,
          error: "활동 기록을 불러오지 못했습니다.",
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [limit]);

  return state;
}
