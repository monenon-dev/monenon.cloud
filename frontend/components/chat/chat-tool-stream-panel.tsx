"use client";

import { useEffect, useRef, useState } from "react";
import { ToolStream, type ToolCallResult } from "@/components/home/tool-stream";

const MAX_VISIBLE = 8;
const LIVE_PUSH_MS = 520;
const FADE_OUT_MS = 900;

type LiveToolItem = ToolCallResult & { exiting?: boolean };

type ChatToolStreamPanelProps = {
  toolLogs: ToolCallResult[];
  className?: string;
};

/** 채팅 화면용 Tool Stream — briefing/report 응답의 tool_logs를 순차 표시. */
export function ChatToolStreamPanel({ toolLogs, className = "" }: ChatToolStreamPanelProps) {
  const [stream, setStream] = useState({
    items: [] as LiveToolItem[],
    seq: 0,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (toolLogs.length === 0) {
      setStream({ items: [], seq: 0 });
      return;
    }

    let cancelled = false;
    setStream({ items: [], seq: 0 });
    let index = 0;

    const pushNext = () => {
      if (cancelled || index >= toolLogs.length) return;
      const fixture = toolLogs[index]!;
      index += 1;
      setStream((prev) => {
        const next: LiveToolItem = { ...fixture };
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
      if (index < toolLogs.length) {
        window.setTimeout(pushNext, LIVE_PUSH_MS);
      }
    };

    pushNext();
    return () => {
      cancelled = true;
    };
  }, [toolLogs]);

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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
  }, [stream.seq]);

  if (toolLogs.length === 0) return null;

  const visibleItems = stream.items.filter((i) => !i.exiting);

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-900/40 ${className}`}
    >
      <p className="border-b border-gray-200 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-indigo-600/80 dark:border-gray-700 dark:text-indigo-300/80">
        tool stream
      </p>
      <div
        ref={scrollRef}
        className="max-h-48 overflow-y-auto overscroll-contain px-3 py-2"
      >
        <ToolStream items={visibleItems} />
      </div>
    </div>
  );
}
