import { fetchMockAgentHistoryLive } from "@/lib/agent-history/mock-live-store";
import type {
  AgentHistoryListResponse,
  FetchAgentHistoryOptions,
} from "@/lib/agent-history/types";

/**
 * Agent history REST client.
 * Swap implementation when backend route exists — keep options.since / before.
 */
export async function fetchAgentHistoryLogs(
  options: FetchAgentHistoryOptions = {}
): Promise<AgentHistoryListResponse> {
  await new Promise((r) => setTimeout(r, 120));
  return fetchMockAgentHistoryLive(options);
}
