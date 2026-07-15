import Link from "next/link";
import { Bot, Github } from "lucide-react";

import { routes } from "@/lib/routes";

const SHELL = "mx-auto w-full max-w-6xl xl:max-w-7xl px-4 sm:px-6 lg:px-8";
export const MONEO_GITHUB_URL = "https://github.com/monenon-dev/monenon.cloud";

export function HomeCtaSection() {
  return (
    <section
      className="relative overflow-hidden border-t border-white/10"
      aria-label="시작하기"
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 80% at 50% 35%, rgba(99, 102, 241, 0.2), transparent 70%)," +
            "radial-gradient(ellipse 45% 40% at 50% 90%, rgba(139, 92, 246, 0.1), transparent 65%)",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-[42%] -z-10 size-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/12 blur-3xl"
        aria-hidden
      />

      <div
        className={`${SHELL} flex flex-col items-center px-4 pb-12 pt-16 text-center sm:pb-14 sm:pt-20 lg:pb-16 lg:pt-24`}
      >
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.5rem] lg:leading-tight">
          지금 바로 시작해보세요
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--moneo-muted)]">
          업무 맥락을 이해한 에이전트와 바로 대화를 시작하세요.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={routes.lifestyle.chats}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-[0_0_24px_rgba(99,102,241,0.35)] transition-colors hover:bg-indigo-400"
          >
            <Bot size={16} />
            에이전트 채팅 시작하기
          </Link>
          <a
            href={MONEO_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2 text-sm font-medium text-indigo-100 transition-colors hover:border-indigo-400/35 hover:bg-white/[0.07]"
          >
            <Github size={16} aria-hidden />
            GitHub에서 코드 보기
          </a>
        </div>
      </div>
    </section>
  );
}
