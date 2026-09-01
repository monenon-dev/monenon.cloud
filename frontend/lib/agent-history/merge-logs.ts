import { AGENT_HISTORY_CLIENT_MAX } from "@/lib/agent-history/constants";
import type { AgentHistoryLog } from "@/lib/agent-history/types";

export type MergePollResult = {
  logs: AgentHistoryLog[];
  newIds: string[];
  statusChangedIds: string[];
};

function sortNewestFirst(logs: AgentHistoryLog[]): AgentHistoryLog[] {
  return [...logs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/** Merge incremental poll payload into the in-memory list. */
export function mergePollLogs(
  prev: AgentHistoryLog[],
  incoming: AgentHistoryLog[],
  patches: AgentHistoryLog[] = []
): MergePollResult {
  const byId = new Map(prev.map((l) => [l.id, l]));
  const newIds: string[] = [];
  const statusChangedIds: string[] = [];

  for (const patch of patches) {
    const old = byId.get(patch.id);
    if (old && old.status !== patch.status) {
      statusChangedIds.push(patch.id);
    }
    byId.set(patch.id, patch);
  }

  for (const item of incoming) {
    if (!byId.has(item.id)) {
      newIds.push(item.id);
    }
    byId.set(item.id, item);
  }

  const logs = sortNewestFirst([...byId.values()]).slice(0, AGENT_HISTORY_CLIENT_MAX);
  return { logs, newIds, statusChangedIds };
}

/** Append older page (scroll pagination). */
export function appendOlderLogs(
  prev: AgentHistoryLog[],
  older: AgentHistoryLog[]
): AgentHistoryLog[] {
  const byId = new Map(prev.map((l) => [l.id, l]));
  for (const row of older) {
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  return sortNewestFirst([...byId.values()]);
}

export function hasRunningLogs(logs: AgentHistoryLog[]): boolean {
  return logs.some((l) => l.status === "running");
}
