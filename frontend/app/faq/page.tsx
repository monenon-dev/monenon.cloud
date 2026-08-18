"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { FaqAccordion } from "@/components/home/faq-accordion";
import { HomeFooter } from "@/components/home/home-footer";
import {
  LANDING_PAGE_SHELL,
  LandingSiteHeader,
} from "@/components/home/landing-site-header";
import { HomeSidebar } from "@/components/layout/home-sidebar";
import { getAuthSession, logoutAuthSession } from "@/lib/auth-api";
import {
  loadMyPagePreferences,
  needsProfileOnboarding,
} from "@/lib/mypage-preferences";
import { routes } from "@/lib/routes";

type AuthUser = { nickname: string; role: string };

export default function FaqPage() {
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
    logoutAuthSession(routes.oauth.login);
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
          {/* 헤로 */}
          <section className={`${LANDING_PAGE_SHELL} py-10 sm:py-14 lg:py-16`}>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-400/80">
              FAQ
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
              자주 묻는 질문
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--moneo-muted)] sm:text-lg">
              실제로 동작하는 기능을 기준으로 답변을 작성했습니다.
              준비 중인 항목은 별도로 표시합니다.
            </p>
          </section>

          {/* 아코디언 */}
          <section
            className={`${LANDING_PAGE_SHELL} border-t border-white/10 py-10 sm:py-14 lg:py-16`}
            aria-label="자주 묻는 질문 목록"
          >
            <div className="mx-auto max-w-3xl">
              <FaqAccordion />
            </div>
          </section>
        </main>

        <HomeFooter />
      </div>
    </div>
  );
}
