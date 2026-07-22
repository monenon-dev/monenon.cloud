import type {
  AgentHistoryLog,
  AgentHistoryListResponse,
  FetchAgentHistoryOptions,
} from "@/lib/agent-history/types";
import {
  AGENT_HISTORY_FILTER_AGENTS,
  AGENT_HISTORY_FILTER_STATUSES,
  buildInitialAgentHistoryLogs,
  SCENARIOS,
} from "@/lib/agent-history/mock-data";

export { AGENT_HISTORY_FILTER_AGENTS, AGENT_HISTORY_FILTER_STATUSES };

type LiveStore = {
  logs: Map<string, AgentHistoryLog>;
  pendingPatches: Set<string>;
  tick: number;
  nextSeq: number;
};

const store: LiveStore = {
  logs: new Map(buildInitialAgentHistoryLogs().map((l) => [l.id, l])),
  pendingPatches: new Set(),
  tick: 0,
  nextSeq: 1,
};

function sortedLogs(): AgentHistoryLog[] {
  return [...store.logs.values()].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

function spawnLiveEvent(): AgentHistoryLog {
  const scenario = SCENARIOS[store.nextSeq % SCENARIOS.length]!;
  const id = `live_${String(store.nextSeq++).padStart(4, "0")}`;
  return {
    id,
    timestamp: new Date().toISOString(),
    agentName: scenario.agentName,
    tool: scenario.tool,
    status: "running",
    durationMs: 900 + (store.nextSeq % 5) * 200,
    tokens: 180 + (store.nextSeq % 7) * 40,
    prompt: scenario.prompt,
    responseSummary: `${scenario.tool} 실행 중 — 요청을 처리하고 있습니다.`,
    toolParams: { ...scenario.toolParams },
  };
}

function advanceLiveStore(): void {
  store.tick += 1;

  const running = [...store.logs.values()].filter((l) => l.status === "running");
  if (running.length > 0 && store.tick % 2 === 0) {
    const target = running[0]!;
    const failed = store.tick % 6 === 0;
    const scenario = SCENARIOS[store.tick % SCENARIOS.length]!;
    const next: AgentHistoryLog = {
      ...target,
      status: failed ? "failed" : "success",
      durationMs: target.durationMs + 1200 + store.tick * 40,
      tokens: target.tokens + 120,
      responseSummary: failed
        ? `${target.tool} 실패 — 요청을 완료하지 못했습니다.`
        : scenario.responseSummary,
    };
    store.logs.set(target.id, next);
    store.pendingPatches.add(target.id);
  }

  if (store.tick % 3 === 0) {
    const fresh = spawnLiveEvent();
    store.logs.set(fresh.id, fresh);
  }
}

function consumePatches(): AgentHistoryLog[] {
  const patches = [...store.pendingPatches]
    .map((id) => store.logs.get(id))
    .filter((l): l is AgentHistoryLog => Boolean(l));
  store.pendingPatches.clear();
  return patches;
}

export function fetchMockAgentHistoryLive(
  options: FetchAgentHistoryOptions = {}
): AgentHistoryListResponse {
  advanceLiveStore();

  const all = sortedLogs();
  const limit = options.limit ?? 100;

  if (options.before) {
    const beforeMs = new Date(options.before).getTime();
    const older = all.filter((l) => new Date(l.timestamp).getTime() < beforeMs);
    return {
      items: older.slice(0, limit),
      total: all.length,
      hasMore: older.length > limit,
    };
  }

  if (options.since) {
    const sinceMs = new Date(options.since).getTime();
    const items = all.filter((l) => new Date(l.timestamp).getTime() > sinceMs);
    const patches = consumePatches().filter(
      (l) => new Date(l.timestamp).getTime() <= sinceMs
    );
    return {
      items,
      patches,
      total: all.length,
      hasMore: all.length > limit,
    };
  }

  consumePatches();
  return {
    items: all.slice(0, limit),
    total: all.length,
    hasMore: all.length > limit,
  };
}

export function resetMockAgentHistoryLive(): void {
  store.logs = new Map(buildInitialAgentHistoryLogs().map((l) => [l.id, l]));
  store.pendingPatches.clear();
  store.tick = 0;
  store.nextSeq = 1;
}
