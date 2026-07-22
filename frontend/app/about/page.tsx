"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Play } from "lucide-react";

import { AboutFeatureSections } from "@/components/home/about-feature-sections";
import { AgentPreview } from "@/components/home/agent-preview";
import { BuiltWithSection } from "@/components/home/built-with-section";
import { HomeFooter } from "@/components/home/home-footer";
import {
  LANDING_PAGE_SHELL,
  LandingSiteHeader,
} from "@/components/home/landing-site-header";
import { HomeSidebar } from "@/components/layout/home-sidebar";
import { clearAuthSession, getAuthSession } from "@/lib/auth-api";
import { LANDING_SECTION_IDS } from "@/lib/landing-sections";
import {
  loadMyPagePreferences,
  needsProfileOnboarding,
} from "@/lib/mypage-preferences";
import { routes } from "@/lib/routes";

type AuthUser = { nickname: string; role: string };

export default function AboutPage() {
  const router = useRouter();
  const [ui, setUi] = useState({
    sidebarOpen: false,
    authUser: null as AuthUser | null,
  });

  const patchUi = (patch: Partial<typeof ui>) =>
    setUi((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    const session = getAuthSession();
    if (session) {
      if (needsProfileOnboarding(loadMyPagePreferences(session.user_id))) {
        router.replace(routes.oauth.onboarding);
        return;
      }
      patchUi({ authUser: { nickname: session.nickname, role: session.role } });
    }
  }, [router]);

  const handleLogout = () => {
    clearAuthSession();
    patchUi({ authUser: null });
  };

  return (
    <div className="relative flex min-h-dvh items-start moneo-grid-bg text-[var(--moneo-text)]">
      <div className="moneo-noise pointer-events-none absolute inset-0 -z-10" aria-hidden />

      <HomeSidebar
        open={ui.sidebarOpen}
        onClose={() => patchUi({ sidebarOpen: false })}
      />

      <div className="relative z-10 flex w-full min-w-0 flex-1 flex-col">
        <LandingSiteHeader
          sidebarOpen={ui.sidebarOpen}
          onSidebarToggle={() => patchUi({ sidebarOpen: !ui.sidebarOpen })}
          authUser={ui.authUser}
          onLogout={handleLogout}
        />

        <main>
          <section className={`${LANDING_PAGE_SHELL} py-10 sm:py-14 lg:py-16`}>
            <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] lg:gap-10">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-400/80">
                  About moneo
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
                  moneo가 하는 일
                </h1>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--moneo-muted)] sm:text-lg">
                  AI Agents, Orchestrated for Work
                </p>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-gray-400 sm:text-base">
                  업무 맥락을 이해하는 에이전트가 일정·문서·대화를 엮어, 하루를 시작하고
                  정리하고 보고하는 반복 업무를 대신 처리합니다.
                </p>
              </div>

              <div className="min-w-0 w-full">
                <AgentPreview className="w-full" href={routes.demo} />
              </div>
            </div>
          </section>

          <section
            className={`${LANDING_PAGE_SHELL} border-t border-white/10 py-14 sm:py-16 lg:py-20`}
            aria-label="핵심 기능"
          >
            <AboutFeatureSections />
          </section>

          <section className={`${LANDING_PAGE_SHELL} pb-10 sm:pb-14`}>
            <BuiltWithSection
              id={LANDING_SECTION_IDS.architecture}
              className="scroll-mt-20"
            />
          </section>

          <section
            className="relative overflow-hidden border-t border-white/10"
            aria-label="시작하기"
          >
            <div
              className="pointer-events-none absolute inset-0 -z-10"
              aria-hidden
              style={{
                background:
                  "radial-gradient(ellipse 70% 80% at 50% 35%, rgba(99, 102, 241, 0.18), transparent 70%)," +
                  "radial-gradient(ellipse 45% 40% at 50% 90%, rgba(139, 92, 246, 0.08), transparent 65%)",
              }}
            />
            <div
              className={`${LANDING_PAGE_SHELL} flex flex-col items-center py-14 text-center sm:py-16 lg:py-20`}
            >
              <h2 className="max-w-2xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                에이전트와 업무를 시작해 보세요
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--moneo-muted)]">
                브리핑부터 리포트까지, 반복 업무는 moneo에게 맡기고 본업에 집중하세요.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={routes.lifestyle.chats}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_28px_rgba(99,102,241,0.4)] transition-colors hover:bg-indigo-400"
                >
                  <Bot size={18} />
                  에이전트 채팅 시작하기
                </Link>
                <Link
                  href={routes.demo}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-indigo-100 transition-colors hover:border-indigo-400/35 hover:bg-white/[0.07]"
                >
                  <Play size={18} />
                  데모 보기
                </Link>
              </div>
            </div>
          </section>
        </main>

        <HomeFooter />
      </div>
    </div>
  );
}
