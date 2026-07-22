"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bot, Play } from "lucide-react";

import { ArchitectureStackSections } from "@/components/home/architecture-stack-sections";
import { HomeFooter } from "@/components/home/home-footer";
import {
  LANDING_PAGE_SHELL,
  LandingSiteHeader,
} from "@/components/home/landing-site-header";
import { HomeSidebar } from "@/components/layout/home-sidebar";
import { clearAuthSession, getAuthSession } from "@/lib/auth-api";
import {
  loadMyPagePreferences,
  needsProfileOnboarding,
} from "@/lib/mypage-preferences";
import { routes } from "@/lib/routes";

type AuthUser = { nickname: string; role: string };

export default function ArchitecturePage() {
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
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-400/80">
              Architecture
            </p>
            <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
              moneo의 아키텍처
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--moneo-muted)] sm:text-lg">
              AI 에이전트 오케스트레이션을 위한 기술 스택
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-gray-400 sm:text-base">
              여러 에이전트가 도구를 호출하고, 문서를 검색하고, 결과를 조립하는 흐름을
              안정적으로 운영하기 위해 아래 스택을 사용합니다.
            </p>
          </section>

          <section
            className={`${LANDING_PAGE_SHELL} border-t border-white/10 py-14 sm:py-16 lg:py-20`}
            aria-label="기술 스택"
          >
            <ArchitectureStackSections />
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
                직접 써보고 흐름을 확인해 보세요
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--moneo-muted)]">
                에이전트 채팅으로 바로 시작하거나, 데모에서 오케스트레이션 흐름을 미리 볼 수
                있습니다.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={routes.lifestyle.chats}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_28px_rgba(99,102,241,0.4)] transition-colors hover:bg-indigo-400"
                >
                  <Bot size={18} />
                  직접 써보기
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
