"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot } from "lucide-react";
import {
  ToolStream,
  type ToolCallResult,
} from "@/components/home/tool-stream";
import { getAuthSession } from "@/lib/auth-api";
import { fetchTodayBriefing } from "@/lib/briefing-api";
import { HOME_MEETINGS_SAVED_EVENT } from "@/lib/home-meetings-events";
import { loadMyPagePreferences } from "@/lib/mypage-preferences";
import { BriefingNotesField } from "@/components/chat/briefing-notes-field";

const CHAT_LINES = [
  { role: "user" as const, text: "오늘 오전 스탠드업 브리핑 요약해 줘." },
  {
    role: "agent" as const,
    text: "캘린더 · 문서 · 최근 대화에서 컨텍스트를 모으는 중…",
  },
  {
    role: "agent" as const,
    text: "3개 액션 아이템과 리스크 1건을 정리했습니다. 리포트 초안을 채팅에 올렸습니다.",
  },
];

/** Demo fixtures — 비로그인 미리보기용. */
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
    toolName: "history.digest",
    status: "success",
    params: { limit: 12 },
    result: {
      type: "list",
      items: [
        { title: "나", meta: "user", preview: "오늘 일정 정리해줘" },
        { title: "에이전트", meta: "assistant", preview: "오전 스탠드업과 디자인 싱크가 있습니다." },
      ],
    },
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
          preview: "North-star: reduce time-to-brief for ops agents under 45s…",
          score: 0.91,
        },
      ],
    },
  },
];

const MAX_VISIBLE = 8;
const ADD_INTERVAL_MS = 4800;
const PROMOTE_PENDING_MS = 1600;
const FADE_OUT_MS = 900;
const STREAM_LIST_MIN_H = "18.5rem";
const PREVIEW_BODY_HEIGHT = `calc(${STREAM_LIST_MIN_H} + 3.75rem)`;
const LIVE_PUSH_MS = 520;

type LiveToolItem = ToolCallResult & { exiting?: boolean };

type PreviewChatLine = { role: "user" | "agent"; text: string };

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

export function AgentPreview({
  className = "",
  href,
  live = false,
}: {
  className?: string;
  /** When set, the whole preview becomes a link to the demo page. */
  href?: string;
  /** 로그인 사용자 — /agent/briefing/today 실데이터 */
  live?: boolean;
}) {
  const [briefingRefreshToken, setBriefingRefreshToken] = useState(0);
  const [ui, setUi] = useState({
    mode: "demo" as "demo" | "live" | "loading" | "error",
    chatLines: CHAT_LINES as PreviewChatLine[],
    toolLogs: [] as ToolCallResult[],
    error: null as string | null,
    notes: "",
    userId: null as number | null,
  });
  const [chat, setChat] = useState({ chars: 0, line: 0 });
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!live) {
      setUi({
        mode: "demo",
        chatLines: CHAT_LINES,
        toolLogs: [],
        error: null,
        notes: "",
        userId: null,
      });
      return;
    }

    const session = getAuthSession();
    if (!session) {
      setUi({
        mode: "demo",
        chatLines: CHAT_LINES,
        toolLogs: [],
        error: null,
        notes: "",
        userId: null,
      });
      return;
    }

    let cancelled = false;
    setUi((prev) => ({ ...prev, mode: "loading", error: null, userId: session.user_id }));
    const prefs = loadMyPagePreferences(session.user_id);

    void (async () => {
      try {
        const briefing = await fetchTodayBriefing(session.user_id, {
          speechTone: prefs.speechTone,
          userType: prefs.userType,
          industry: prefs.industry,
          forceRefresh: briefingRefreshToken > 0,
        });
        if (cancelled) return;
        setUi({
          mode: "live",
          chatLines: [
            { role: "agent", text: "오늘의 브리핑" },
            { role: "agent", text: briefing.content },
          ],
          toolLogs: briefing.tool_logs,
          error: null,
          notes: briefing.user_notes ?? "",
          userId: session.user_id,
        });
        setChat({ chars: 0, line: 0 });
      } catch (e) {
        if (cancelled) return;
        setUi({
          mode: "error",
          chatLines: [
            {
              role: "agent",
              text:
                e instanceof Error
                  ? e.message
                  : "오늘의 브리핑을 불러오지 못했습니다.",
            },
          ],
          toolLogs: [],
          error: e instanceof Error ? e.message : "briefing_error",
          notes: "",
          userId: session.user_id,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [live, briefingRefreshToken]);

  useEffect(() => {
    if (!live) return;
    const onMeetingsSaved = () => {
      setBriefingRefreshToken((prev) => prev + 1);
    };
    window.addEventListener(HOME_MEETINGS_SAVED_EVENT, onMeetingsSaved);
    return () => window.removeEventListener(HOME_MEETINGS_SAVED_EVENT, onMeetingsSaved);
  }, [live]);

  const lines = ui.chatLines.length > 0 ? ui.chatLines : CHAT_LINES;
  const line = lines[Math.min(chat.line, lines.length - 1)] ?? lines[0];
  const visibleText = line.text.slice(0, chat.chars);
  const isLive = ui.mode === "live" || ui.mode === "loading" || ui.mode === "error";

  useEffect(() => {
    if (ui.mode === "loading") return;
    const full = line.text;
    if (chat.chars < full.length) {
      const id = window.setTimeout(() => {
        setChat((prev) => ({ ...prev, chars: prev.chars + 1 }));
      }, isLive ? 12 : 28);
      return () => window.clearTimeout(id);
    }
    if (chat.line >= lines.length - 1) return;
    const id = window.setTimeout(() => {
      setChat((prev) => ({
        line: prev.line + 1,
        chars: 0,
      }));
    }, isLive ? 400 : 1200);
    return () => window.clearTimeout(id);
  }, [chat.chars, chat.line, line.text, lines.length, ui.mode, isLive]);

  useEffect(() => {
    scrollPanelBottom(chatScrollRef.current);
  }, [chat.chars, chat.line]);

  const panelClassName = `relative flex flex-col rounded-2xl border border-white/10 bg-[rgba(18,18,28,0.72)] shadow-[0_0_40px_rgba(99,102,241,0.18)] backdrop-blur-md [overflow-anchor:none] ${className}`;
  const linkHref = isLive ? undefined : href;

  const inner = (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="size-2.5 rounded-full bg-rose-400/80" />
        <span className="size-2.5 rounded-full bg-amber-400/80" />
        <span className="size-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-2 font-mono text-[11px] tracking-wide text-indigo-200/70">
          {ui.mode === "live"
            ? "agent · today briefing"
            : ui.mode === "loading"
              ? "agent · loading briefing…"
              : "agent · live session"}
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
          {ui.mode === "loading" ? (
            <PreviewBubble role="agent" text="오늘의 브리핑을 준비하는 중…" typing />
          ) : (
            <>
              {lines.slice(0, chat.line).map((msg, i) => (
                <PreviewBubble key={`${msg.role}-${i}`} role={msg.role} text={msg.text} done />
              ))}
              <PreviewBubble
                role={line.role}
                text={visibleText}
                typing={chat.chars < line.text.length}
              />
            </>
          )}
          {ui.mode === "live" && ui.userId ? (
            <BriefingNotesField
              userId={ui.userId}
              initialNotes={ui.notes}
              className="mt-1"
            />
          ) : null}
        </div>

        <ToolStreamPanel liveLogs={ui.mode === "live" ? ui.toolLogs : null} />
      </div>

      {linkHref ? (
        <span
          className="pointer-events-none absolute bottom-3 right-3 rounded-md border border-indigo-400/30 bg-indigo-500/15 px-2 py-1 text-[11px] font-medium text-indigo-200 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden
        >
          데모 보기 →
        </span>
      ) : null}
    </>
  );

  if (linkHref) {
    return (
      <Link
        href={linkHref}
        className={`group block w-full text-left transition-[transform,box-shadow,border-color] duration-200 ease-out hover:scale-[1.01] hover:border-indigo-400/35 hover:shadow-[0_0_48px_rgba(99,102,241,0.28)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500/60 ${panelClassName}`}
        aria-label="멀티에이전트 오케스트레이션 데모 보기"
      >
        {inner}
      </Link>
    );
  }

  return (
    <div className={panelClassName} aria-label="Moneo agent preview">
      {inner}
    </div>
  );
}

function ToolStreamPanel({ liveLogs }: { liveLogs: ToolCallResult[] | null }) {
  const [stream, setStream] = useState({
    items: [] as LiveToolItem[],
    seq: 0,
  });
  const streamScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (liveLogs === null) return;
    if (liveLogs.length === 0) {
      setStream({ items: [], seq: 0 });
      return;
    }

    let cancelled = false;
    setStream({ items: [], seq: 0 });
    let index = 0;

    const pushNext = () => {
      if (cancelled || index >= liveLogs.length) return;
      const fixture = liveLogs[index]!;
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
      if (index < liveLogs.length) {
        window.setTimeout(pushNext, LIVE_PUSH_MS);
      }
    };

    pushNext();
    return () => {
      cancelled = true;
    };
  }, [liveLogs]);

  useEffect(() => {
    if (liveLogs !== null) return;

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
  }, [liveLogs]);

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
    if (liveLogs !== null) return;
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
                ],
              },
            };
          }
          return { ...item, status: "success" as const };
        }),
      }));
    }, PROMOTE_PENDING_MS);
    return () => window.clearTimeout(id);
  }, [stream.items, liveLogs]);

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
          onRetry={
            liveLogs
              ? undefined
              : (item) => {
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
                }
          }
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
        className={`max-w-[92%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
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
