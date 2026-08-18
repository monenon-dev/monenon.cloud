"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getAuthSession } from "@/lib/auth-api";
import { fetchTodayBriefing } from "@/lib/briefing-api";
import { HOME_MEETINGS_SAVED_EVENT } from "@/lib/home-meetings-events";
import { loadMyPagePreferences } from "@/lib/mypage-preferences";
import { BriefingNotesField } from "@/components/chat/briefing-notes-field";
import { PreviewBubble } from "@/components/home/preview-bubble";

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

type PreviewChatLine = { role: "user" | "agent"; text: string };

const PREVIEW_BODY_HEIGHT = "22rem";

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
        className="md:h-[var(--preview-body-h)] md:overflow-hidden"
        style={{ ["--preview-body-h" as string]: PREVIEW_BODY_HEIGHT }}
      >
        <div
          ref={chatScrollRef}
          className="moneo-thin-scrollbar space-y-3 overflow-y-auto overscroll-contain p-4 [overflow-anchor:none] md:min-h-0 md:h-full"
        >
          {ui.mode === "loading" ? (
            <PreviewBubble role="agent" text="오늘의 브리핑을 준비하는 중…" typing />
          ) : (
            <>
              {lines.slice(0, chat.line).map((msg, i) => (
                <PreviewBubble key={`${msg.role}-${i}`} role={msg.role} text={msg.text} />
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
