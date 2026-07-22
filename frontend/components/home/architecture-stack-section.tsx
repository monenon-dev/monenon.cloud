"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Database,
  GitBranch,
  Search,
  type LucideIcon,
} from "lucide-react";

export const ARCHITECTURE_STACK: {
  icon: LucideIcon;
  title: string;
  blurb: string;
  tags: string[];
}[] = [
  {
    icon: GitBranch,
    title: "Multi-Agent Orchestration",
    blurb:
      "LangGraph로 여러 에이전트의 역할·도구 호출 흐름을 그래프처럼 조율합니다. 브리핑·검색·리포트 에이전트가 단계별로 협업합니다.",
    tags: ["LangGraph", "Python", "FastAPI"],
  },
  {
    icon: Search,
    title: "RAG Pipeline",
    blurb:
      "업무 문서·이력을 검색·주입해 답변에 근거를 붙이는 검색 증강 생성 파이프라인입니다. 청킹·임베딩·리랭킹까지 한 흐름으로 연결됩니다.",
    tags: ["RAG", "Gemini", "KiwiPiePy"],
  },
  {
    icon: Database,
    title: "Vector + Relational DB",
    blurb:
      "PostgreSQL에서 관계형 데이터와 벡터 검색을 함께 써서 구조와 의미를 동시에 다룹니다. 사용자·세션·문서 메타는 SQL, 의미 검색은 pgvector로 처리합니다.",
    tags: ["PostgreSQL", "pgvector", "SQLAlchemy"],
  },
  {
    icon: Box,
    title: "Containerized Deployment",
    blurb:
      "Docker로 API·워커·인프라를 묶어 동일한 환경으로 배포하고 확장합니다. 로컬 개발과 프로덕션 구성을 compose로 맞춥니다.",
    tags: ["Docker", "Uvicorn", "Vercel"],
  },
];

const STAGGER_S = 0.12;

export function ArchitectureStackSection({ className = "" }: { className?: string }) {
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
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [revealed]);

  return (
    <section ref={sectionRef} className={className} aria-label="기술 스택">
      <ul className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:gap-6">
        {ARCHITECTURE_STACK.map((item, index) => {
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
              <article className="moneo-glass flex h-full w-full flex-col rounded-2xl border border-white/10 p-6 transition-[border-color,background-color] duration-200 hover:border-white/18 hover:bg-white/[0.05]">
                <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-500/15 text-indigo-300">
                  <Icon size={20} aria-hidden />
                </div>
                <h3 className="mt-4 text-base font-semibold leading-snug text-white">
                  {item.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--moneo-muted)]">
                  {item.blurb}
                </p>
                <ul className="mt-4 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <li key={tag}>
                      <span className="inline-flex rounded-md border border-indigo-400/20 bg-indigo-500/10 px-2 py-0.5 font-mono text-[10px] text-indigo-200/90">
                        {tag}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
