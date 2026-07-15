"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, CheckCircle2, Loader2, XCircle } from "lucide-react";

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

type ToolStatus = "running" | "ok" | "error";

type ToolPattern = {
  tool: string;
  detail: string;
  status: ToolStatus;
};

/** Demo-only patterns — no API */
const TOOL_PATTERNS: ToolPattern[] = [
  { tool: "calendar.list", detail: "meetings=4", status: "ok" },
  { tool: "docs.search", detail: "q=Q3 plan", status: "running" },
  { tool: "email.draft", detail: "to=team@moneo.ai", status: "ok" },
  { tool: "report.generate", detail: "tokens=842", status: "ok" },
  { tool: "slack.digest", detail: "channels=3", status: "running" },
  { tool: "docs.search", detail: "hits=12", status: "ok" },
  { tool: "vector.query", detail: "top_k=8", status: "error" },
];

const MAX_VISIBLE = 4;
const ADD_INTERVAL_MS = 4800;
const TYPE_MS = 42;
const FADE_OUT_MS = 900;
/**
 * Fixed height so typing never shifts layout.
 * Shorter on lg+ so hero + cards fit a 100vh snap panel.
 */
const PANEL_HEIGHT_CLASS =
  "h-[360px] sm:h-[380px] lg:h-[min(250px,30dvh)] xl:h-[min(280px,32dvh)]";

type LiveToolItem = ToolPattern & {
  id: string;
  t: string;
  typed: number;
  exiting: boolean;
};

function clockStamp(): string {
  const d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

function pickPattern(seq: number): ToolPattern {
  return TOOL_PATTERNS[seq % TOOL_PATTERNS.length]!;
}

function scrollToBottom(el: HTMLElement | null, behavior: ScrollBehavior = "smooth") {
  if (!el) return;
  el.scrollTo({ top: el.scrollHeight, behavior });
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
    scrollToBottom(chatScrollRef.current);
  }, [chat.chars, chat.line]);

  return (
    <div
      className={`relative flex ${PANEL_HEIGHT_CLASS} flex-col overflow-hidden rounded-2xl border border-white/10 bg-[rgba(18,18,28,0.72)] shadow-[0_0_40px_rgba(99,102,241,0.18)] backdrop-blur-md ${className}`}
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

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(0,1.25fr)_minmax(12.5rem,0.95fr)]">
        <div
          ref={chatScrollRef}
          className="moneo-thin-scrollbar space-y-3 overflow-y-auto overscroll-contain border-b border-white/10 p-4 md:border-b-0 md:border-r"
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

  // Spawn next log every few seconds
  useEffect(() => {
    const spawn = () => {
      setStream((prev) => {
        const pattern = pickPattern(prev.seq);
        const next: LiveToolItem = {
          ...pattern,
          id: `${Date.now()}-${prev.seq}`,
          t: clockStamp(),
          typed: 0,
          exiting: false,
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

  // Remove exiting rows after fade
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

  // Typewriter; keep spinner longer, then promote running → ok
  useEffect(() => {
    const typingItem = stream.items.find(
      (i) => !i.exiting && i.typed < i.detail.length
    );
    if (typingItem) {
      const id = window.setTimeout(() => {
        setStream((prev) => ({
          ...prev,
          items: prev.items.map((item) => {
            if (item.id !== typingItem.id || item.exiting) return item;
            if (item.typed >= item.detail.length) return item;
            return { ...item, typed: item.typed + 1 };
          }),
        }));
      }, TYPE_MS);
      return () => window.clearTimeout(id);
    }

    const toComplete = stream.items.find(
      (i) =>
        !i.exiting &&
        i.status === "running" &&
        i.typed >= i.detail.length
    );
    if (!toComplete) return;
    const id = window.setTimeout(() => {
      setStream((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === toComplete.id ? { ...item, status: "ok" as const } : item
        ),
      }));
    }, 1400);
    return () => window.clearTimeout(id);
  }, [stream.items]);

  useEffect(() => {
    const el = streamScrollRef.current;
    if (!el) return;
    // Only on new spawn — scrolling every typed char was janky and looked like stalls
    el.scrollTo({ top: 0, behavior: "smooth" });
  }, [stream.seq]);

  return (
    <div className="flex min-h-0 min-w-[12.5rem] flex-col p-4">
      <p className="mb-2 shrink-0 font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-300/80">
        tool stream
      </p>
      <div
        ref={streamScrollRef}
        className="moneo-thin-scrollbar relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain"
      >
        {stream.items.map((ev) => (
          <div
            key={ev.id}
            className={`tool-stream-row flex items-start gap-2 overflow-hidden rounded-lg border bg-white/[0.03] px-2.5 font-mono text-[11px] ${
              ev.exiting
                ? "tool-stream-row--out pointer-events-none border-transparent py-0 opacity-0"
                : "tool-stream-row--in border-white/5 py-2 opacity-100"
            }`}
          >
            <span className="relative mt-0.5 size-3.5 shrink-0">
              <Loader2
                className={`absolute inset-0 size-3.5 animate-spin text-sky-400 transition-opacity duration-500 ${
                  ev.status === "running" ? "opacity-100" : "opacity-0"
                }`}
                aria-hidden
              />
              <XCircle
                className={`absolute inset-0 size-3.5 text-rose-400 transition-opacity duration-500 ${
                  ev.status === "error" ? "opacity-100" : "opacity-0"
                }`}
                aria-hidden
              />
              <CheckCircle2
                className={`absolute inset-0 size-3.5 text-emerald-400 transition-opacity duration-500 ${
                  ev.status === "ok" ? "opacity-100" : "opacity-0"
                }`}
                aria-hidden
              />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-indigo-100/50">{ev.t}</p>
              <p className="truncate text-indigo-100" title={ev.tool}>
                {ev.tool}
              </p>
              <p className="break-all text-indigo-200/60">
                {ev.detail.slice(0, ev.typed)}
                {ev.typed < ev.detail.length ? (
                  <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-indigo-300/70 align-middle" />
                ) : null}
              </p>
            </div>
          </div>
        ))}
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
