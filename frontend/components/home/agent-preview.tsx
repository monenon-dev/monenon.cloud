"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { PreviewBubble } from "@/components/home/preview-bubble";

const DEMO_LINES = [
  { role: "user" as const, text: "오늘 일정 기준으로 브리핑해 줘." },
  {
    role: "agent" as const,
    text: "캘린더와 할 일을 모아 오늘의 브리핑을 만들었어요.",
  },
  {
    role: "agent" as const,
    text:
      "16:40  슈퍼바이저 미팅\n" +
      "18:00  퇴근\n\n" +
      "오늘의 할 일\n" +
      "• 투자자 미팅 자료 검토 및 최종 점검\n" +
      "• 슈퍼바이저 미팅 시 논의할 안건 정리",
  },
];

const PREVIEW_BODY_HEIGHT = "22rem";

function scrollPanelBottom(el: HTMLElement | null) {
  if (!el) return;
  if (el.scrollHeight <= el.clientHeight + 1) return;
  el.scrollTop = el.scrollHeight;
}

export function AgentPreview({
  className = "",
  href,
}: {
  className?: string;
  /** When set, the whole preview becomes a link to the demo page. */
  href?: string;
}) {
  const [chat, setChat] = useState({ chars: 0, line: 0 });
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const line = DEMO_LINES[Math.min(chat.line, DEMO_LINES.length - 1)] ?? DEMO_LINES[0];
  const visibleText = line.text.slice(0, chat.chars);

  useEffect(() => {
    const full = line.text;
    if (chat.chars < full.length) {
      const id = window.setTimeout(() => {
        setChat((prev) => ({ ...prev, chars: prev.chars + 1 }));
      }, 28);
      return () => window.clearTimeout(id);
    }
    if (chat.line >= DEMO_LINES.length - 1) return;
    const id = window.setTimeout(() => {
      setChat((prev) => ({
        line: prev.line + 1,
        chars: 0,
      }));
    }, 1200);
    return () => window.clearTimeout(id);
  }, [chat.chars, chat.line, line.text]);

  useEffect(() => {
    scrollPanelBottom(chatScrollRef.current);
  }, [chat.chars, chat.line]);

  const panelClassName = `relative flex flex-col rounded-2xl border border-white/10 bg-[rgba(18,18,28,0.72)] shadow-[0_0_40px_rgba(99,102,241,0.18)] backdrop-blur-md [overflow-anchor:none] ${className}`;

  const inner = (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="size-2.5 rounded-full bg-rose-400/80" />
        <span className="size-2.5 rounded-full bg-amber-400/80" />
        <span className="size-2.5 rounded-full bg-emerald-400/80" />
        <span className="ml-2 font-mono text-[11px] tracking-wide text-indigo-200/70">
          agent · today briefing
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
          {DEMO_LINES.slice(0, chat.line).map((msg, i) => (
            <PreviewBubble key={`${msg.role}-${i}`} role={msg.role} text={msg.text} />
          ))}
          <PreviewBubble
            role={line.role}
            text={visibleText}
            typing={chat.chars < line.text.length}
          />
        </div>
      </div>

      {href ? (
        <span
          className="pointer-events-none absolute bottom-3 right-3 rounded-md border border-indigo-400/30 bg-indigo-500/15 px-2 py-1 text-[11px] font-medium text-indigo-200 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
          aria-hidden
        >
          데모 보기 →
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
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
