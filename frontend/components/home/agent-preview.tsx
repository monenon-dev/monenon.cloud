"use client";

import { useEffect, useRef, useState } from "react";
import { Bot } from "lucide-react";
import {
  ToolStream,
  type ToolCallResult,
} from "@/components/home/tool-stream";

const CHAT_LINES = [
  { role: "user" as const, text: "오늘 오전 스탠드업 브리핑 요약해 줘." },
  {
    role: "agent" as const,
    text: "캘린더 · Slack · 문서에서 컨텍스트를 모으는 중…",
  },
  {
    role: "agent" as const,
    text: "3개 액션 아이템과 리스크 1건을 정리했습니다. 리포트 초안을 채팅에 올렸습니다.",
  },
];

/** Demo fixtures — injected into ToolStream (not defined inside the UI component). */
const TOOL_CALL_FIXTURES: Omit<ToolCallResult, "id" | "timestamp">[] = [
  {
    toolName: "calendar.list",
    status: "success",
    params: { range: "today", meetings: 4 },
    result: {
      type: "list",
      items: [
        { title: "Standup · Core", meta: "09:30" },
        { title: "Design sync", meta: "10:15" },
        { title: "Investor prep", meta: "11:00" },
        { title: "Lunch / buffer", meta: "12:30" },
      ],
    },
  },
  {
    toolName: "docs.search",
    status: "pending",
    params: { q: "Q3 plan", top_k: 5 },
  },
  {
    toolName: "email.draft",
    status: "success",
    params: { to: "team@moneo.ai" },
    result: {
      type: "draft",
      items: [
        {
          title: "Re: Morning standup brief",
          meta: "team@moneo.ai",
          preview:
            "팀 여러분, 오늘 스탠드업에서 나온 액션 아이템 3건과 리스크 1건을 공유합니다…",
        },
      ],
    },
  },
  {
    toolName: "slack.digest",
    status: "pending",
    params: { channels: 3, since: "08:00" },
  },
  {
    toolName: "docs.search",
    status: "success",
    params: { q: "Q3 plan", hits: 12 },
    result: {
      type: "rag",
      items: [
        {
          title: "q3-roadmap.md",
          preview:
            "North-star: reduce time-to-brief for ops agents under 45s…",
          score: 0.91,
        },
        {
          title: "planning/notes-0612.txt",
          preview: "Risk: vendor SLA drift on calendar sync path…",
          score: 0.74,
        },
        {
          title: "archive/old-okr.md",
          preview: "Legacy OKR draft — mostly superseded by roadmap.",
          score: 0.41,
        },
      ],
    },
  },
  {
    toolName: "vector.query",
    status: "error",
    params: { top_k: 8, collection: "ops_docs" },
    error: {
      code: "VECTOR_TIMEOUT",
      message: "Timed out waiting for embedding index (ops_docs).",
    },
  },
  {
    toolName: "slack.digest",
    status: "success",
    params: { channels: 3 },
    result: {
      type: "list",
      items: [
        { title: "#ops-alerts", meta: "14 msgs" },
        { title: "#product", meta: "6 msgs" },
        { title: "#moneo-agent", meta: "9 msgs" },
      ],
    },
  },
];

const MAX_VISIBLE = 5;
const ADD_INTERVAL_MS = 4800;
const PROMOTE_PENDING_MS = 1600;
const FADE_OUT_MS = 900;
const STREAM_LIST_MIN_H = "16.5rem";
const PREVIEW_BODY_HEIGHT = `calc(${STREAM_LIST_MIN_H} + 3.75rem)`;

type LiveToolItem = ToolCallResult & { exiting?: boolean };

function clockStamp(): string {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

function pickFixture(seq: number): Omit<ToolCallResult, "id" | "timestamp"> {
  return TOOL_CALL_FIXTURES[seq % TOOL_CALL_FIXTURES.length]!;
}

function scrollPanelTop(el: HTMLElement | null, top: number) {
  if (!el) return;
  if (el.scrollHeight <= el.clientHeight + 1) return;
  el.scrollTop = top;
}

function scrollPanelBottom(el: HTMLElement | null) {
  if (!el) return;
  if (el.scrollHeight <= el.clientHeight + 1) return;
  el.scrollTop = el.scrollHeight;
}

export function AgentPreview({ className = "" }: { className?: string }) {
  const [chat, setChat] = useState({ chars: 0, line: 0 });
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const line = CHAT_LINES[chat.line] ?? CHAT_LINES[0];
  const visibleText = line.text.slice(0, chat.chars);

  useEffect(() => {
    const full = line.text;
    if (chat.chars < full.length) {
      const id = window.setTimeout(() => {
        setChat((prev) => ({ ...prev, chars: prev.chars + 1 }));
      }, 28);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(() => {
      setChat((prev) => ({
        line: (prev.line + 1) % CHAT_LINES.length,
        chars: 0,
      }));
    }, 1200);
    return () => window.clearTimeout(id);
  }, [chat.chars, chat.line, line.text]);

  useEffect(() => {
    scrollPanelBottom(chatScrollRef.current);
  }, [chat.chars, chat.line]);

  return (
    <div
      className={`relative flex flex-col rounded-2xl border border-white/10 bg-[rgba(18,18,28,0.72)] shadow-[0_0_40px_rgba(99,102,241,0.18)] backdrop-blur-md [overflow-anchor:none] ${className}`}
      aria-label="Moneo agent preview"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="size-2.5 rounded-full bg-rose-400/80" />
        <span className="size-2.5 rounded-full bg-amber-400/80" />
        <span className="size-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-2 font-mono text-[11px] tracking-wide text-indigo-200/70">
          agent · live session
        </span>
      </div>

      <div
        className="grid grid-cols-1 md:h-[var(--preview-body-h)] md:grid-cols-[minmax(0,1.25fr)_minmax(12.5rem,0.95fr)] md:overflow-hidden"
        style={{ ["--preview-body-h" as string]: PREVIEW_BODY_HEIGHT }}
      >
        <div
          ref={chatScrollRef}
          className="moneo-thin-scrollbar space-y-3 overflow-y-auto overscroll-contain border-b border-white/10 p-4 [overflow-anchor:none] md:min-h-0 md:border-b-0 md:border-r"
        >
          {CHAT_LINES.slice(0, chat.line).map((msg, i) => (
            <PreviewBubble key={`${msg.role}-${i}`} role={msg.role} text={msg.text} done />
          ))}
          <PreviewBubble
            role={line.role}
            text={visibleText}
            typing={chat.chars < line.text.length}
          />
        </div>

        <ToolStreamPanel />
      </div>
    </div>
  );
}

function ToolStreamPanel() {
  const [stream, setStream] = useState({
    items: [] as LiveToolItem[],
    seq: 0,
  });
  const streamScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const spawn = () => {
      setStream((prev) => {
        const fixture = pickFixture(prev.seq);
        const next: LiveToolItem = {
          ...fixture,
          id: `${Date.now()}-${prev.seq}`,
          timestamp: clockStamp(),
        };
        const active = prev.items.filter((i) => !i.exiting);
        const exiting = prev.items.filter((i) => i.exiting);
        let activeNext = [next, ...active];
        let overflow: LiveToolItem[] = [];
        if (activeNext.length > MAX_VISIBLE) {
          overflow = activeNext.slice(MAX_VISIBLE).map((item) => ({
            ...item,
            exiting: true,
          }));
          activeNext = activeNext.slice(0, MAX_VISIBLE);
        }
        return {
          items: [...activeNext, ...overflow, ...exiting],
          seq: prev.seq + 1,
        };
      });
    };

    spawn();
    const id = window.setInterval(spawn, ADD_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const exiting = stream.items.filter((i) => i.exiting);
    if (exiting.length === 0) return;
    const id = window.setTimeout(() => {
      setStream((prev) => ({
        ...prev,
        items: prev.items.filter((i) => !i.exiting),
      }));
    }, FADE_OUT_MS);
    return () => window.clearTimeout(id);
  }, [stream.items]);

  // Promote pending fixtures that have a success payload in the catalog
  useEffect(() => {
    const pending = stream.items.find(
      (i) => !i.exiting && i.status === "pending"
    );
    if (!pending) return;
    const id = window.setTimeout(() => {
      setStream((prev) => ({
        ...prev,
        items: prev.items.map((item) => {
          if (item.id !== pending.id || item.exiting) return item;
          if (item.toolName === "docs.search") {
            return {
              ...item,
              status: "success" as const,
              params: { ...item.params, hits: 12 },
              result: {
                type: "rag" as const,
                items: [
                  {
                    title: "q3-roadmap.md",
                    preview:
                      "North-star: reduce time-to-brief for ops agents under 45s…",
                    score: 0.88,
                  },
                  {
                    title: "standup-template.md",
                    preview: "Agenda · blockers · owners — keep under 8 min.",
                    score: 0.63,
                  },
                  {
                    title: "noise/wiki-dump.md",
                    preview: "Unrelated wiki dump — low relevance.",
                    score: 0.37,
                  },
                ],
              },
            };
          }
          if (item.toolName === "slack.digest") {
            return {
              ...item,
              status: "success" as const,
              result: {
                type: "list" as const,
                items: [
                  { title: "#ops-alerts", meta: "11 msgs" },
                  { title: "#product", meta: "4 msgs" },
                  { title: "#moneo-agent", meta: "7 msgs" },
                ],
              },
            };
          }
          return { ...item, status: "success" as const };
        }),
      }));
    }, PROMOTE_PENDING_MS);
    return () => window.clearTimeout(id);
  }, [stream.items]);

  useEffect(() => {
    scrollPanelTop(streamScrollRef.current, 0);
  }, [stream.seq]);

  const visibleItems = stream.items.filter((i) => !i.exiting);

  return (
    <div className="flex min-w-[12.5rem] shrink-0 flex-col p-4">
      <p className="mb-2 shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-300/80">
        tool stream
      </p>
      <div
        ref={streamScrollRef}
        className="moneo-thin-scrollbar relative overflow-y-auto overscroll-contain [overflow-anchor:none]"
        style={{ height: STREAM_LIST_MIN_H, minHeight: STREAM_LIST_MIN_H }}
      >
        <ToolStream
          items={visibleItems}
          onRetry={(item) => {
            setStream((prev) => ({
              ...prev,
              items: prev.items.map((row) =>
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
      </div>
    </div>
  );
}

function PreviewBubble({
  role,
  text,
  done,
  typing,
}: {
  role: "user" | "agent";
  text: string;
  done?: boolean;
  typing?: boolean;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-indigo-400/30 bg-indigo-500/15 text-indigo-300">
          <Bot size={14} />
        </div>
      )}
      <div
        className={`max-w-[92%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
          isUser
            ? "bg-indigo-500/25 text-indigo-50 border border-indigo-400/20"
            : "bg-white/[0.04] text-zinc-200 border border-white/10"
        }`}
      >
        {text}
        {typing && !done ? (
          <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-indigo-300/80 align-middle" />
        ) : null}
      </div>
    </div>
  );
}
