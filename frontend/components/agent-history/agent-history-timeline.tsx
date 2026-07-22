"use client";

import { AGENT_HISTORY_TIMELINE_LIMIT } from "@/lib/agent-history/constants";
import type { AgentHistoryLog } from "@/lib/agent-history/types";
import type { AgentHistoryLiveHighlights } from "@/hooks/use-agent-history-live";
import { AgentHistoryTimelineItemControlled } from "@/components/agent-history/agent-history-timeline-item";

type Props = {
  logs: AgentHistoryLog[];
  highlights: AgentHistoryLiveHighlights;
};

export function AgentHistoryTimeline({ logs, highlights }: Props) {
  const visible = logs.slice(0, AGENT_HISTORY_TIMELINE_LIMIT);

  return (
    <section aria-label="최근 활동">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-indigo-300/70">
        최근 활동
      </h2>
      <ol className="relative mt-5 space-y-0 border-l border-white/10 ml-2.5">
        {visible.map((log) => (
          <AgentHistoryTimelineItemControlled
            key={log.id}
            log={log}
            highlights={highlights}
          />
        ))}
      </ol>
    </section>
  );
}
