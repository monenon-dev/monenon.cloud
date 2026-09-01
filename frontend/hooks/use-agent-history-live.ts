"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAgentHistoryLogs } from "@/lib/agent-history/api";
import {
  AGENT_HISTORY_CLIENT_MAX,
  AGENT_HISTORY_HIGHLIGHT_MS,
  AGENT_HISTORY_POLL_ACTIVE_MS,
  AGENT_HISTORY_POLL_IDLE_MS,
} from "@/lib/agent-history/constants";
import {
  appendOlderLogs,
  hasRunningLogs,
  mergePollLogs,
} from "@/lib/agent-history/merge-logs";
import type { AgentHistoryLog } from "@/lib/agent-history/types";

export type AgentHistoryLiveMeta = {
  loading: boolean;
  error: string | null;
  pollingIntervalMs: number;
  isPolling: boolean;
  totalCount: number;
  hasMoreOlder: boolean;
  loadingMore: boolean;
};

export type AgentHistoryLiveHighlights = {
  isNew: (id: string) => boolean;
  isStatusChanged: (id: string) => boolean;
};

export type UseAgentHistoryLiveResult = {
  logs: AgentHistoryLog[];
  meta: AgentHistoryLiveMeta;
  highlights: AgentHistoryLiveHighlights;
  loadMoreOlder: () => void;
};

type LiveState = {
  logs: AgentHistoryLog[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  pollingIntervalMs: number;
  isVisible: boolean;
  totalCount: number;
  hasMoreOlder: boolean;
  highlightNew: Record<string, number>;
  highlightStatus: Record<string, number>;
};

function pruneHighlights(map: Record<string, number>): Record<string, number> {
  const now = Date.now();
  return Object.fromEntries(
    Object.entries(map).filter(([, exp]) => exp > now)
  );
}

function markHighlights(
  prev: LiveState,
  newIds: string[],
  statusIds: string[]
): Pick<LiveState, "highlightNew" | "highlightStatus"> {
  const expiry = Date.now() + AGENT_HISTORY_HIGHLIGHT_MS;
  const highlightNew = { ...prev.highlightNew };
  const highlightStatus = { ...prev.highlightStatus };
  for (const id of newIds) highlightNew[id] = expiry;
  for (const id of statusIds) highlightStatus[id] = expiry;
  return {
    highlightNew: pruneHighlights(highlightNew),
    highlightStatus: pruneHighlights(highlightStatus),
  };
}

/**
 * Polling-based live feed — transport is encapsulated here for future WebSocket swap.
 */
export function useAgentHistoryLive(): UseAgentHistoryLiveResult {
  const [state, setState] = useState<LiveState>({
    logs: [],
    loading: true,
    loadingMore: false,
    error: null,
    pollingIntervalMs: AGENT_HISTORY_POLL_IDLE_MS,
    isVisible: true,
    totalCount: 0,
    hasMoreOlder: false,
    highlightNew: {},
    highlightStatus: {},
  });

  const latestTimestampRef = useRef<string | null>(null);
  const oldestTimestampRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);
  const intervalRef = useRef(AGENT_HISTORY_POLL_IDLE_MS);
  const isVisibleRef = useRef(true);

  const syncTimestamps = useCallback((logs: AgentHistoryLog[]) => {
    if (logs.length === 0) {
      latestTimestampRef.current = null;
      oldestTimestampRef.current = null;
      return;
    }
    latestTimestampRef.current = logs[0]!.timestamp;
    oldestTimestampRef.current = logs[logs.length - 1]!.timestamp;
  }, []);

  const runPoll = useCallback(async () => {
    if (!isVisibleRef.current || inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const since = latestTimestampRef.current ?? undefined;
      const res = await fetchAgentHistoryLogs({
        since,
        limit: AGENT_HISTORY_CLIENT_MAX,
      });

      setState((prev) => {
        const merged = since
          ? mergePollLogs(prev.logs, res.items, res.patches ?? [])
          : {
              logs: res.items.slice(0, AGENT_HISTORY_CLIENT_MAX),
              newIds: [] as string[],
              statusChangedIds: [] as string[],
            };

        syncTimestamps(merged.logs);
        const pollingIntervalMs = hasRunningLogs(merged.logs)
          ? AGENT_HISTORY_POLL_ACTIVE_MS
          : AGENT_HISTORY_POLL_IDLE_MS;
        intervalRef.current = pollingIntervalMs;

        return {
          ...prev,
          logs: merged.logs,
          loading: false,
          error: null,
          pollingIntervalMs,
          totalCount: res.total,
          hasMoreOlder: Boolean(res.hasMore) || res.total > merged.logs.length,
          ...markHighlights(prev, merged.newIds, merged.statusChangedIds),
        };
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error:
          err instanceof Error ? err.message : "히스토리를 불러오지 못했습니다.",
      }));
    } finally {
      inFlightRef.current = false;
    }
  }, [syncTimestamps]);

  const loadMoreOlder = useCallback(async () => {
    const before = oldestTimestampRef.current;
    if (!before) return;

    setState((prev) => {
      if (prev.loadingMore) return prev;
      return { ...prev, loadingMore: true };
    });

    try {
      const res = await fetchAgentHistoryLogs({ before, limit: 20 });
      setState((prev) => {
        const logs = appendOlderLogs(prev.logs, res.items);
        syncTimestamps(logs);
        return {
          ...prev,
          logs,
          loadingMore: false,
          hasMoreOlder: Boolean(res.hasMore),
          totalCount: res.total,
        };
      });
    } catch {
      setState((prev) => ({ ...prev, loadingMore: false }));
    }
  }, [syncTimestamps]);

  useEffect(() => {
    void runPoll();
  }, [runPoll]);

  useEffect(() => {
    if (!state.isVisible || state.loading) return;

    const id = window.setInterval(() => {
      void runPoll();
    }, state.pollingIntervalMs);

    return () => window.clearInterval(id);
  }, [runPoll, state.isVisible, state.loading, state.pollingIntervalMs]);

  useEffect(() => {
    const onVisibility = () => {
      const visible = document.visibilityState === "visible";
      isVisibleRef.current = visible;
      setState((prev) => ({ ...prev, isVisible: visible }));
      if (visible) void runPoll();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [runPoll]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setState((prev) => ({
        ...prev,
        highlightNew: pruneHighlights(prev.highlightNew),
        highlightStatus: pruneHighlights(prev.highlightStatus),
      }));
    }, 400);
    return () => window.clearInterval(id);
  }, []);

  const highlights: AgentHistoryLiveHighlights = {
    isNew: (id) => (state.highlightNew[id] ?? 0) > Date.now(),
    isStatusChanged: (id) => (state.highlightStatus[id] ?? 0) > Date.now(),
  };

  return {
    logs: state.logs,
    meta: {
      loading: state.loading,
      error: state.error,
      pollingIntervalMs: state.pollingIntervalMs,
      isPolling: state.isVisible && !state.loading,
      totalCount: state.totalCount,
      hasMoreOlder: state.hasMoreOlder,
      loadingMore: state.loadingMore,
    },
    highlights,
    loadMoreOlder,
  };
}
