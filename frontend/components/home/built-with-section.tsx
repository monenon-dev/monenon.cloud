"use client";

import { useEffect, useRef, useState } from "react";
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

const STAGGER_S = 0.12;

export function BuiltWithSection({
  className = "",
  compact = false,
}: {
  className?: string;
  /** Tighter spacing for 100vh snap panel on desktop */
  compact?: boolean;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el || revealed) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setRevealed(true);
        observer.disconnect();
      },
      { threshold: 0.12, rootMargin: "0px 0px -24px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [revealed]);

  return (
    <section
      ref={sectionRef}
      className={`${compact ? "mt-0" : "mt-12 sm:mt-14"} ${className}`}
      aria-label="Built with"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-indigo-300/70">
        Built with
      </p>
      <ul
        className={`mt-3 grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 lg:grid-cols-4 ${
          compact ? "lg:gap-3" : "gap-4 lg:gap-4 mt-4"
        }`}
      >
        {BUILT_WITH.map((item, index) => {
          const Icon = item.icon;
          return (
            <li
              key={item.title}
              className={`built-with-reveal flex h-full ${
                revealed ? "built-with-reveal--in" : ""
              }`}
              style={{
                transitionDelay: revealed ? `${index * STAGGER_S}s` : "0s",
              }}
            >
              <article
                className={`moneo-glass flex h-full w-full flex-col rounded-2xl border border-white/10 transition-[border-color,background-color] duration-200 hover:border-white/18 hover:bg-white/[0.05] ${
                  compact
                    ? "min-h-0 p-3.5 lg:p-4"
                    : "min-h-[11.5rem] p-5"
                }`}
              >
                <div className="inline-flex size-8 shrink-0 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-500/15 text-indigo-300 lg:size-9">
                  <Icon size={compact ? 16 : 18} aria-hidden />
                </div>
                <h3 className="mt-2 text-sm font-semibold leading-snug text-white lg:mt-2.5">
                  {item.title}
                </h3>
                <p className="mt-1.5 flex-1 text-xs leading-relaxed text-[var(--moneo-muted)] lg:line-clamp-3">
                  {item.blurb}
                </p>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
