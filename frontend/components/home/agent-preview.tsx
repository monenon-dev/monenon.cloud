"use client";

import { useEffect, useState } from "react";
import { Bot, CheckCircle2, Loader2, Wrench } from "lucide-react";

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

const STREAM_EVENTS = [
  { t: "09:41:02", tool: "calendar.list", status: "ok" as const, detail: "meetings=4" },
  { t: "09:41:03", tool: "docs.search", status: "running" as const, detail: "q=Q3 plan" },
  { t: "09:41:05", tool: "docs.search", status: "ok" as const, detail: "hits=12" },
  { t: "09:41:06", tool: "report.draft", status: "ok" as const, detail: "tokens=842" },
];

export function AgentPreview({ className = "" }: { className?: string }) {
  const [ui, setUi] = useState({
    chatChars: 0,
    chatLine: 0,
    streamCount: 1,
  });

  const line = CHAT_LINES[ui.chatLine] ?? CHAT_LINES[0];
  const visibleText = line.text.slice(0, ui.chatChars);

  useEffect(() => {
    const full = line.text;
    if (ui.chatChars < full.length) {
      const id = window.setTimeout(() => {
        setUi((prev) => ({ ...prev, chatChars: prev.chatChars + 1 }));
      }, 28);
      return () => window.clearTimeout(id);
    }

    const id = window.setTimeout(() => {
      setUi((prev) => {
        const nextLine = (prev.chatLine + 1) % CHAT_LINES.length;
        const nextStream =
          nextLine === 0
            ? 1
            : Math.min(STREAM_EVENTS.length, prev.streamCount + 1);
        return { chatLine: nextLine, chatChars: 0, streamCount: nextStream };
      });
    }, 1200);
    return () => window.clearTimeout(id);
  }, [ui.chatChars, ui.chatLine, line.text]);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[rgba(18,18,28,0.72)] shadow-[0_0_40px_rgba(99,102,241,0.18)] backdrop-blur-md ${className}`}
      aria-label="Moneo agent preview"
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="size-2.5 rounded-full bg-rose-400/80" />
        <span className="size-2.5 rounded-full bg-amber-400/80" />
        <span className="size-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-2 font-mono text-[11px] tracking-wide text-indigo-200/70">
          agent · live session
        </span>
      </div>

      <div className="grid gap-0 md:grid-cols-5">
        <div className="space-y-3 border-b border-white/10 p-4 md:col-span-3 md:border-b-0 md:border-r">
          {CHAT_LINES.slice(0, ui.chatLine).map((msg, i) => (
            <PreviewBubble key={`${msg.role}-${i}`} role={msg.role} text={msg.text} done />
          ))}
          <PreviewBubble role={line.role} text={visibleText} typing={ui.chatChars < line.text.length} />
        </div>

        <div className="space-y-2 p-4 md:col-span-2">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-300/80">
            tool stream
          </p>
          {STREAM_EVENTS.slice(0, ui.streamCount).map((ev) => (
            <div
              key={`${ev.t}-${ev.tool}-${ev.status}`}
              className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-2 font-mono text-[11px]"
            >
              {ev.status === "running" ? (
                <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin text-indigo-400" />
              ) : ev.status === "ok" ? (
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
              ) : (
                <Wrench className="mt-0.5 size-3.5 shrink-0 text-indigo-300" />
              )}
              <div className="min-w-0">
                <p className="text-indigo-100/50">{ev.t}</p>
                <p className="truncate text-indigo-100">{ev.tool}</p>
                <p className="truncate text-indigo-200/60">{ev.detail}</p>
              </div>
            </div>
          ))}
        </div>
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
