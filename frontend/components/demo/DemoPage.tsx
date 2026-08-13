"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  FileBarChart,
  Files,
  type LucideIcon,
} from "lucide-react";
import Logo from "@/components/brand/Logo";
import { ScenarioPlayer } from "@/components/demo/ScenarioPlayer";
import {
  DEMO_SCENARIOS,
  type DemoScenario,
  type ScenarioCategory,
} from "@/components/demo/scenarios";
import { CalendarCheckWidget } from "@/components/home/calendar-check-widget";
import { getAuthSession } from "@/lib/auth-api";
import { routes } from "@/lib/routes";

const TAB_META: Record<
  ScenarioCategory,
  { icon: LucideIcon; label: string }
> = {
  briefing: { icon: BriefcaseBusiness, label: "업무 브리핑" },
  docs: { icon: Files, label: "문서 정리" },
  report: { icon: FileBarChart, label: "리포트 생성" },
};

const PAGE_SHELL =
  "mx-auto w-full max-w-6xl xl:max-w-7xl px-4 sm:px-6 lg:px-8";

type DemoPageProps = {
  initialScenarioId?: string;
};

/**
 * Showcase page: live calendar check first, then scripted orchestration replay.
 */
export function DemoPage({ initialScenarioId }: DemoPageProps) {
  const initial =
    DEMO_SCENARIOS.find((s) => s.id === initialScenarioId) ?? DEMO_SCENARIOS[0]!;
  const [ui, setUi] = useState({
    scenarioId: initial.id,
    isLoggedIn: false,
  });

  useEffect(() => {
    setUi((prev) => ({ ...prev, isLoggedIn: Boolean(getAuthSession()) }));
  }, []);

  const scenario: DemoScenario =
    DEMO_SCENARIOS.find((s) => s.id === ui.scenarioId) ?? DEMO_SCENARIOS[0]!;

  return (
    <div className="relative min-h-dvh moneo-grid-bg text-[var(--moneo-text)]">
      <div className="moneo-noise pointer-events-none absolute inset-0 -z-10" aria-hidden />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-[rgba(10,10,15,0.82)] backdrop-blur-md">
        <div className={`${PAGE_SHELL} flex h-14 items-center justify-between sm:h-16`}>
          <Link href={routes.home} className="inline-flex items-center gap-2">
            <Logo variant="horizontal" size={28} />
          </Link>
          <Link
            href={routes.lifestyle.chats}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-400/30 bg-indigo-500/15 px-3 py-1.5 text-[12px] font-medium text-indigo-100 hover:bg-indigo-500/25"
          >
            Agent Chat
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </header>

      <div className="border-b border-indigo-400/20 bg-indigo-500/10">
        <div
          className={`${PAGE_SHELL} flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between`}
        >
          <p className="text-sm leading-relaxed text-indigo-100/90">
            먼저 오늘 일정을 직접 넣어 밀림·겹침을 느껴보고, 아래에서 전체 오케스트레이션
            재생을 이어서 보세요.
          </p>
          <Link
            href={routes.lifestyle.chats}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-indigo-500 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-indigo-400"
          >
            Agent Chat 열기
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>

      <main className={`${PAGE_SHELL} space-y-10 py-8 pb-16`}>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--moneo-gold,#D4AF37)]/80">
            try · calendar check
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            지금 놓치고 있는 일정을 확인해 보세요
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            로그인 없이 입력만 하면, 실제 감지 로직이 밀도와 겹침을 바로 알려줍니다.
          </p>
        </div>

        <CalendarCheckWidget isLoggedIn={ui.isLoggedIn} className="max-w-2xl" />

        <div className="border-t border-white/10 pt-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--moneo-gold,#D4AF37)]/80">
            showcase · orchestration
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-50 sm:text-2xl">
            LangGraph 멀티에이전트 재생
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
            채팅을 입력하지 않아도, 시나리오가 자동으로 재생되며 Router → 전문
            에이전트 → Synthesizer 흐름과 Tool Stream을 관찰할 수 있습니다.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="시나리오 선택"
          className="flex flex-wrap gap-2"
        >
          {DEMO_SCENARIOS.map((s) => {
            const meta = TAB_META[s.category];
            const Icon = meta.icon;
            const active = s.id === ui.scenarioId;
            return (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setUi((prev) => ({ ...prev, scenarioId: s.id }))}
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-sm transition-colors ${
                  active
                    ? "border-indigo-400/40 bg-indigo-500/15 text-indigo-50"
                    : "border-white/10 bg-white/[0.02] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                }`}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span>
                  <span className="block font-medium">{s.tabLabel}</span>
                  <span className="mt-0.5 block text-[11px] opacity-70">
                    {s.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <ScenarioPlayer scenario={scenario} />

        <section className="rounded-2xl border border-white/10 bg-[rgba(18,18,28,0.65)] px-6 py-8 text-center shadow-[0_0_40px_rgba(99,102,241,0.12)]">
          <h2 className="text-xl font-semibold text-zinc-50">직접 써보기</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
            데모 시나리오와 같은 흐름으로, 실제 Agent Chat에서 업무를 맡겨 보세요.
          </p>
          <Link
            href={routes.lifestyle.chats}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-400"
          >
            Agent Chat으로 이동
            <ArrowRight className="size-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
