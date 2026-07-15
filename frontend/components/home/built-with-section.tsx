"use client";

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
  return (
    <section className={`mt-12 sm:mt-14 ${className}`} aria-label="Built with">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-indigo-300/70">
        Built with
      </p>
      <ul className="mt-4 grid grid-cols-1 items-stretch gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {BUILT_WITH.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.title} className="h-full min-h-0">
              <div className="moneo-glass flex h-full min-h-[9.5rem] flex-col rounded-xl border border-white/10 px-3.5 py-3 transition-[border-color,background-color] duration-200 hover:border-white/20 hover:bg-white/[0.06]">
                <div className="inline-flex min-w-0 items-center gap-2">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-indigo-400/25 bg-indigo-500/15 text-indigo-300">
                    <Icon size={14} aria-hidden />
                  </span>
                  <span className="text-xs font-medium leading-snug text-indigo-50/95">
                    {item.title}
                  </span>
                </div>
                <p className="mt-2.5 flex-1 text-[11px] leading-relaxed text-[var(--moneo-muted)]">
                  {item.blurb}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
