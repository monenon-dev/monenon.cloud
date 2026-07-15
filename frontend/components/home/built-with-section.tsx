"use client";

import { useState } from "react";
import {
  Box,
  Database,
  GitBranch,
  Search,
  type LucideIcon,
} from "lucide-react";

const BUILT_WITH: {
  icon: LucideIcon;
  title: string;
  blurb: string;
}[] = [
  {
    icon: GitBranch,
    title: "Multi-Agent Orchestration",
    blurb:
      "LangGraph로 여러 에이전트의 역할·도구 호출 흐름을 그래프처럼 조율합니다.",
  },
  {
    icon: Search,
    title: "RAG Pipeline",
    blurb:
      "업무 문서·이력을 검색·주입해 답변에 근거를 붙이는 검색 증강 생성 파이프라인입니다.",
  },
  {
    icon: Database,
    title: "Vector + Relational DB",
    blurb:
      "PostgreSQL에서 관계형 데이터와 벡터 검색을 함께 써서 구조와 의미를 동시에 다룹니다.",
  },
  {
    icon: Box,
    title: "Containerized Deployment",
    blurb:
      "Docker로 API·워커·인프라를 묶어 동일한 환경으로 배포하고 확장합니다.",
  },
];

export function BuiltWithSection({ className = "" }: { className?: string }) {
  const [ui, setUi] = useState({ openId: null as string | null });

  return (
    <section className={`mt-12 sm:mt-14 ${className}`} aria-label="Built with">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-indigo-300/70">
        Built with
      </p>
      <ul className="mt-4 grid grid-cols-1 gap-2.5 overflow-visible sm:grid-cols-2 lg:grid-cols-4">
        {BUILT_WITH.map((item) => {
          const Icon = item.icon;
          const open = ui.openId === item.title;
          return (
            <li key={item.title} className="relative overflow-visible">
              <button
                type="button"
                className="moneo-glass relative z-0 flex h-[3.25rem] w-full items-center rounded-xl px-3.5 text-left transition-[box-shadow,border-color] duration-200 hover:border-indigo-400/35 hover:shadow-[0_0_20px_rgba(99,102,241,0.18)]"
                onMouseEnter={() => setUi({ openId: item.title })}
                onMouseLeave={() => setUi({ openId: null })}
                onFocus={() => setUi({ openId: item.title })}
                onBlur={() => setUi({ openId: null })}
                aria-describedby={open ? `built-with-tip-${item.title}` : undefined}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-indigo-400/25 bg-indigo-500/15 text-indigo-300">
                    <Icon size={14} aria-hidden />
                  </span>
                  <span className="truncate text-xs font-medium leading-snug text-indigo-50/95">
                    {item.title}
                  </span>
                </span>
              </button>

              <div
                id={`built-with-tip-${item.title}`}
                role="tooltip"
                className={`pointer-events-none absolute bottom-[calc(100%+10px)] left-0 right-0 z-30 px-0.5 transition-all duration-200 ease-out ${
                  open
                    ? "translate-y-0 opacity-100"
                    : "translate-y-1.5 opacity-0"
                }`}
              >
                <div className="relative rounded-lg border border-white/12 bg-[#1c1c28] px-3 py-2 text-[11px] leading-relaxed text-[var(--moneo-muted)] shadow-[0_8px_28px_rgba(0,0,0,0.45)]">
                  {item.blurb}
                  <span
                    className="absolute left-5 top-full h-0 w-0 border-x-[6px] border-t-[6px] border-x-transparent border-t-[#1c1c28]"
                    aria-hidden
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
