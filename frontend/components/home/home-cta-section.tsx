import Link from "next/link";
import { Bot } from "lucide-react";

import { routes } from "@/lib/routes";

const SHELL = "mx-auto w-full max-w-6xl xl:max-w-7xl px-4 sm:px-6 lg:px-8";

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
            "radial-gradient(ellipse 70% 80% at 50% 40%, rgba(99, 102, 241, 0.22), transparent 70%)," +
            "radial-gradient(ellipse 50% 50% at 50% 100%, rgba(139, 92, 246, 0.12), transparent 65%)",
        }}
      />
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/15 blur-3xl"
        aria-hidden
      />

      <div className={`${SHELL} flex flex-col items-center px-4 py-24 text-center sm:py-28 lg:py-32`}>
        <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
          지금 바로 시작해보세요
        </h2>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-[var(--moneo-muted)] sm:text-base">
          업무 맥락을 이해한 에이전트와 바로 대화를 시작하세요.
        </p>
        <Link
          href={routes.lifestyle.chats}
          className="mt-10 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_28px_rgba(99,102,241,0.4)] transition-colors hover:bg-indigo-400"
        >
          <Bot size={18} />
          에이전트 채팅 시작하기
        </Link>
      </div>
    </section>
  );
}
