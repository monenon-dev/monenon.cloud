"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Loader2, Pause, Play, RotateCcw } from "lucide-react";
import {
  ToolStream,
  type ToolCallResult,
} from "@/components/home/tool-stream";
import { AgentDelegationSteps } from "@/components/demo/AgentDelegationSteps";
import {
  AgentTraceGraph,
  applyTraceActivation,
} from "@/components/demo/AgentTraceGraph";
import { RagCitationPanel } from "@/components/demo/RagCitationPanel";
import type {
  DemoScenario,
  DelegationStep,
  RagCitation,
  TraceNodeId,
  TraceNodeStatus,
} from "@/components/demo/scenarios";

type ChatMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
  typedChars: number;
  delegation?: DelegationStep[];
};

type PlayerState = {
  playing: boolean;
  clockMs: number;
  eventIndex: number;
  thinking: boolean;
  tools: ToolCallResult[];
  messages: ChatMessage[];
  statusById: Partial<Record<TraceNodeId, TraceNodeStatus>>;
  citations: RagCitation[];
  citationOpen: boolean;
  done: boolean;
  mobileTab: "chat" | "tools" | "trace";
  generation: number;
};

function clockStampFromOffset(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600) % 24;
  const m = Math.floor(total / 60) % 60;
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function initialState(generation = 0): PlayerState {
  return {
    playing: true,
    clockMs: 0,
    eventIndex: 0,
    thinking: false,
    tools: [],
    messages: [],
    statusById: {},
    citations: [],
    citationOpen: false,
    done: false,
    mobileTab: "chat",
    generation,
  };
}

type ScenarioPlayerProps = {
  scenario: DemoScenario;
  className?: string;
};

/**
 * Replays a scripted multi-agent scenario: chat + tool stream + trace sync.
 */
export function ScenarioPlayer({ scenario, className = "" }: ScenarioPlayerProps) {
  const [state, setState] = useState<PlayerState>(() => initialState());
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const toolScrollRef = useRef<HTMLDivElement>(null);
  const scenarioId = scenario.id;

  // Reset when scenario changes
  useEffect(() => {
    setState((prev) => initialState(prev.generation + 1));
  }, [scenarioId]);

  // Playback clock
  useEffect(() => {
    if (!state.playing || state.done) return;
    const id = window.setInterval(() => {
      setState((prev) => {
        if (!prev.playing || prev.done) return prev;
        return { ...prev, clockMs: prev.clockMs + 50 };
      });
    }, 50);
    return () => window.clearInterval(id);
  }, [state.playing, state.done, state.generation]);

  // Apply timeline events
  useEffect(() => {
    const events = scenario.events;
    setState((prev) => {
      if (prev.eventIndex >= events.length) return prev;
      let next = { ...prev };
      let idx = prev.eventIndex;
      let changed = false;

      while (idx < events.length && events[idx]!.atMs <= prev.clockMs) {
        const ev = events[idx]!;
        changed = true;
        idx += 1;

        if (ev.type === "user_message" || ev.type === "agent_message") {
          next = {
            ...next,
            messages: [
              ...next.messages,
              {
                id: `${ev.type}-${idx}`,
                role: ev.type === "user_message" ? "user" : "agent",
                text: ev.text,
                typedChars: 0,
                delegation:
                  ev.type === "agent_message" ? ev.delegation : undefined,
              },
            ],
            citations:
              ev.type === "agent_message" && ev.citations
                ? ev.citations
                : next.citations,
            statusById:
              ev.type === "agent_message"
                ? applyTraceActivation(next.statusById, {
                    activate: "synthesizer",
                    finishAll: true,
                  })
                : next.statusById,
          };
        } else if (ev.type === "thinking") {
          next = { ...next, thinking: ev.show };
        } else if (ev.type === "tool_spawn") {
          const { callId, activateNode, completeNode, ...rest } = ev.tool;
          const tool: ToolCallResult = {
            ...rest,
            id: callId,
            timestamp: clockStampFromOffset(ev.atMs),
          };
          next = {
            ...next,
            tools: [tool, ...next.tools],
            statusById: applyTraceActivation(next.statusById, {
              activate: activateNode,
              complete: completeNode,
            }),
          };
        } else if (ev.type === "tool_patch") {
          if (ev.callId === "__noop") continue;
          next = {
            ...next,
            tools: next.tools.map((t) =>
              t.id === ev.callId ? { ...t, ...ev.patch } : t
            ),
            statusById: applyTraceActivation(next.statusById, {
              activate: ev.activateNode,
              complete: ev.completeNode,
            }),
          };
        } else if (ev.type === "complete") {
          next = {
            ...next,
            done: true,
            playing: false,
            thinking: false,
            statusById: applyTraceActivation(next.statusById, {
              finishAll: true,
            }),
          };
        }
      }

      if (!changed && idx === prev.eventIndex) return prev;
      return { ...next, eventIndex: idx };
    });
  }, [state.clockMs, scenario.events, state.generation]);

  // Typing animation for latest message (continues even after playback completes)
  useEffect(() => {
    const last = state.messages[state.messages.length - 1];
    if (!last || last.typedChars >= last.text.length) return;
    const speed = last.role === "user" ? 22 : 10;
    const id = window.setTimeout(() => {
      setState((prev) => {
        const msgs = [...prev.messages];
        const cur = msgs[msgs.length - 1];
        if (!cur || cur.typedChars >= cur.text.length) return prev;
        msgs[msgs.length - 1] = {
          ...cur,
          typedChars: Math.min(cur.text.length, cur.typedChars + 2),
        };
        return { ...prev, messages: msgs };
      });
    }, speed);
    return () => window.clearTimeout(id);
  }, [state.messages]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [state.messages, state.thinking]);

  useEffect(() => {
    toolScrollRef.current?.scrollTo({ top: 0 });
  }, [state.tools.length]);

  const duration = useMemo(
    () => Math.max(...scenario.events.map((e) => e.atMs), 1),
    [scenario.events]
  );
  const progress = Math.min(1, state.clockMs / duration);

  const patch = (p: Partial<PlayerState>) =>
    setState((prev) => ({ ...prev, ...p }));

  const restart = () => setState((prev) => initialState(prev.generation + 1));

  const chatPane = (
    <div
      ref={chatScrollRef}
      className="moneo-thin-scrollbar h-full space-y-3 overflow-y-auto overscroll-contain p-4"
    >
      {state.messages.map((msg) => {
        const visible = msg.text.slice(0, msg.typedChars);
        const typing = msg.typedChars < msg.text.length;
        return (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "agent" ? (
              <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-indigo-400/30 bg-indigo-500/15 text-indigo-300">
                <Bot size={14} />
              </div>
            ) : null}
            <div
              className={`max-w-[92%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "border border-indigo-400/20 bg-indigo-500/25 text-indigo-50"
                  : "border border-white/10 bg-white/[0.04] text-zinc-200"
              }`}
            >
              {msg.role === "agent" && msg.delegation ? (
                <AgentDelegationSteps
                  steps={msg.delegation}
                  completedCount={
                    typing ? Math.max(1, Math.floor(msg.typedChars / 40)) : undefined
                  }
                />
              ) : null}
              <div className="whitespace-pre-wrap">
                {visible}
                {typing ? (
                  <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-indigo-300/80 align-middle" />
                ) : null}
              </div>
              {msg.role === "agent" &&
              !typing &&
              state.citations.length > 0 &&
              msg.id === state.messages[state.messages.length - 1]?.id ? (
                <button
                  type="button"
                  onClick={() => patch({ citationOpen: true })}
                  className="mt-2 text-[11px] font-medium text-indigo-300 hover:text-indigo-200"
                >
                  인용 문서 {state.citations.length}건 보기 →
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
      {state.thinking ? (
        <div className="flex items-center gap-2 text-sm text-indigo-200/70">
          <Loader2 className="size-4 animate-spin text-indigo-300" />
          생각 중…
        </div>
      ) : null}
    </div>
  );

  const toolsPane = (
    <div className="flex h-full min-h-0 flex-col p-4">
      <p className="mb-2 shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-300/80">
        tool stream
      </p>
      <div
        ref={toolScrollRef}
        className="moneo-thin-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <ToolStream
          items={state.tools}
          onRagItemClick={() => {
            if (state.citations.length) patch({ citationOpen: true });
          }}
          onRetry={(item) => {
            setState((prev) => ({
              ...prev,
              tools: prev.tools.map((row) =>
                row.id === item.id
                  ? {
                      ...row,
                      status: "pending",
                      error: undefined,
                      result: undefined,
                    }
                  : row
              ),
            }));
          }}
        />
        {!state.tools.length ? (
          <p className="font-mono text-[11px] text-indigo-200/40">
            waiting for tool calls…
          </p>
        ) : null}
      </div>
    </div>
  );

  const tracePane = (
    <AgentTraceGraph
      nodes={scenario.nodes}
      edges={scenario.edges}
      statusById={state.statusById}
      className="h-full"
    />
  );

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <div
        className="relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[rgba(18,18,28,0.72)] shadow-[0_0_40px_rgba(99,102,241,0.18)] backdrop-blur-md"
        aria-label="시나리오 재생"
      >
        <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
          <span className="size-2.5 rounded-full bg-rose-400/80" />
          <span className="size-2.5 rounded-full bg-amber-400/80" />
          <span className="size-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-2 font-mono text-[11px] tracking-wide text-indigo-200/70">
            agent · live session · demo
          </span>
          <span className="ml-auto truncate text-[11px] text-zinc-500">
            {scenario.title}
          </span>
        </div>

        {/* Mobile tabs */}
        <div className="flex border-b border-white/10 lg:hidden">
          {(
            [
              ["chat", "채팅"],
              ["tools", "Tool Stream"],
              ["trace", "Agent Trace"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => patch({ mobileTab: id })}
              className={`flex-1 px-2 py-2.5 text-center text-[12px] font-medium ${
                state.mobileTab === id
                  ? "border-b-2 border-indigo-400 text-indigo-200"
                  : "text-zinc-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Desktop layout */}
        <div className="hidden min-h-[28rem] grid-cols-[minmax(0,1.2fr)_minmax(14rem,0.9fr)] lg:grid lg:h-[32rem]">
          <div className="min-h-0 border-r border-white/10">{chatPane}</div>
          <div className="min-h-0">{toolsPane}</div>
        </div>

        {/* Mobile pane */}
        <div className="h-[22rem] lg:hidden">
          {state.mobileTab === "chat"
            ? chatPane
            : state.mobileTab === "tools"
              ? toolsPane
              : tracePane}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 border-t border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={() => {
              if (state.done && !state.playing) {
                restart();
                return;
              }
              patch({ playing: !state.playing });
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-400/30 bg-indigo-500/15 px-3 py-1.5 text-[12px] font-medium text-indigo-100 hover:bg-indigo-500/25"
            aria-label={state.playing ? "일시정지" : "재생"}
          >
            {state.playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {state.playing ? "일시정지" : "재생"}
          </button>
          <button
            type="button"
            onClick={restart}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-zinc-300 hover:bg-white/[0.06]"
          >
            <RotateCcw className="size-3.5" />
            처음부터
          </button>
          <div className="min-w-[8rem] flex-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-indigo-400/80 transition-[width] duration-100"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </div>
          <span className="font-mono text-[10px] tabular-nums text-zinc-500">
            {(state.clockMs / 1000).toFixed(1)}s / {(duration / 1000).toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Trace below on desktop; on mobile available via tab */}
      <div className="hidden lg:block">{tracePane}</div>

      <RagCitationPanel
        open={state.citationOpen}
        citations={state.citations}
        onClose={() => patch({ citationOpen: false })}
      />
    </div>
  );
}
