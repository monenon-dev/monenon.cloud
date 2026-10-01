"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Terminal,
  Bot,
  BriefcaseBusiness,
  Files,
  FileBarChart,
  type LucideIcon,
} from "lucide-react";

import { AgentPreview } from "@/components/home/agent-preview";
import { CalendarCheckWidget } from "@/components/home/calendar-check-widget";
import { DocSummaryWidget } from "@/components/home/doc-summary-widget";
import { WeeklyReportPreviewWidget } from "@/components/home/weekly-report-preview-widget";
import { WeeklyReportPanel } from "@/components/home/weekly-report-panel";
import { HomeCtaSection } from "@/components/home/home-cta-section";
import { HomeFooter } from "@/components/home/home-footer";
import { IntroOverlay } from "@/components/home/intro-overlay";
import {
  LANDING_PAGE_SHELL,
  LandingSiteHeader,
} from "@/components/home/landing-site-header";
import { HomeSidebar } from "@/components/layout/home-sidebar";
import Logo from "@/components/brand/Logo";
import { getAuthSession, logoutAuthSession } from "@/lib/auth-api";
import { buildChatsUrl, saveChatStarter } from "@/lib/chat-starter";
import {
  loadMyPagePreferences,
  needsProfileOnboarding,
} from "@/lib/mypage-preferences";
import { routes } from "@/lib/routes";
import { fetchWeeklyReport, type WeeklyReport } from "@/lib/weekly-report-api";

type AuthUser = { nickname: string; role: string };

const FEATURE_PROMO_CARDS: {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  prompt?: string;
  action?: "weekly-report" | "doc-summary";
}[] = [
  {
    icon: BriefcaseBusiness,
    title: "오늘의 업무 브리핑",
    description:
      "아침에 열어보면, 오늘 손대야 할 것과 미뤄도 되는 것이 이미 갈라져 있어요.",
    prompt: "오늘 일정과 할 일 기준으로 업무 브리핑을 작성해 줘",
  },
  {
    icon: Files,
    title: "문서/자료 정리",
    description:
      "폴더를 뒤지지 않아도, 지금 필요한 자료만 골라서 다음 할 일이 보여요.",
    action: "doc-summary",
  },
  {
    icon: FileBarChart,
    title: "업무 리포트 생성",
    description:
      "금요일에 한 주를 다시 짜맞출 필요 없이, 이미 쌓인 흐름이 한 장으로 남아요.",
    action: "weekly-report",
  },
];

export default function MoneoHomePage() {
  const router = useRouter();
  const [ui, setUi] = useState({
    sidebarOpen: false,
    authUser: null as AuthUser | null,
    weeklyReportOpen: false,
    weeklyReportLoading: false,
    weeklyReportError: null as string | null,
    weeklyReport: null as WeeklyReport | null,
    docWidgetHighlight: false,
    reportWidgetHighlight: false,
  });

  const patchUi = (patch: Partial<typeof ui>) =>
    setUi((prev) => ({ ...prev, ...patch }));

  const navigateToChat = (prompt: string) => {
    const nonce = saveChatStarter(prompt);
    router.push(buildChatsUrl(prompt, nonce));
  };

  const openWeeklyReport = async () => {
    const session = getAuthSession();
    if (!session) {
      router.push(routes.oauth.login);
      return;
    }
    patchUi({
      weeklyReportOpen: true,
      weeklyReportLoading: true,
      weeklyReportError: null,
      weeklyReport: null,
    });
    try {
      const prefs = loadMyPagePreferences(session.user_id);
      const report = await fetchWeeklyReport(session.user_id, {
        speechTone: prefs.speech_tone,
        userType: prefs.user_type,
        industry: prefs.industry,
      });
      patchUi({ weeklyReportLoading: false, weeklyReport: report });
    } catch (err) {
      patchUi({
        weeklyReportLoading: false,
        weeklyReportError:
          err instanceof Error ? err.message : "주간 리포트를 생성하지 못했습니다.",
      });
    }
  };

  const openReportPreviewWidget = () => {
    patchUi({ reportWidgetHighlight: true });
    document.getElementById("weekly-report-preview-widget")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    window.setTimeout(() => patchUi({ reportWidgetHighlight: false }), 2200);
  };

  const openDocSummaryWidget = () => {
    patchUi({ docWidgetHighlight: true });
    document.getElementById("doc-summary-widget")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    window.setTimeout(() => patchUi({ docWidgetHighlight: false }), 2200);
  };

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
      <IntroOverlay />
      <div className="moneo-noise pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <NetworkDecor />

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

        <section className="relative pb-16 sm:pb-20">
          <div className={`${LANDING_PAGE_SHELL} py-10 sm:py-14 lg:py-16`}>
            <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.45fr)_minmax(0,0.55fr)] lg:gap-10">
              <div className="min-w-0">
                <Logo variant="stacked" theme="dark" size={88} className="mb-2" />
                <p className="mt-4 max-w-md text-base leading-relaxed text-[var(--moneo-muted)] sm:text-lg">
                  AI Agents, Orchestrated for Work
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href={routes.lifestyle.chats}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white shadow-[0_0_28px_rgba(99,102,241,0.4)] transition-colors hover:bg-indigo-400"
                  >
                    <Bot size={18} />
                    에이전트 채팅
                  </Link>
                  <Link
                    href={routes.agent.history}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-indigo-100 transition-colors hover:border-indigo-400/30"
                  >
                    <Terminal size={18} />
                    에이전트 히스토리
                  </Link>
                </div>
              </div>

              <div className="min-w-0 w-full">
                <AgentPreview
                  className="w-full"
                  href={ui.authUser ? undefined : routes.demo}
                />
              </div>
            </div>

            <div className="mt-16 space-y-16 sm:mt-24 sm:space-y-24">
              <section className="space-y-4 sm:space-y-5" aria-label="오늘의 업무 브리핑">
                <FeaturePromoCard
                  card={FEATURE_PROMO_CARDS[0]}
                  onActivate={() => {
                    const prompt = FEATURE_PROMO_CARDS[0].prompt;
                    if (!prompt) return;
                    if (!ui.authUser) {
                      const nonce = saveChatStarter(prompt);
                      const next = encodeURIComponent(buildChatsUrl(prompt, nonce));
                      router.push(`${routes.oauth.login}?next=${next}`);
                      return;
                    }
                    navigateToChat(prompt);
                  }}
                />
                <CalendarCheckWidget isLoggedIn={Boolean(ui.authUser)} />
              </section>

              <section className="space-y-4 sm:space-y-5" aria-label="문서/자료 정리">
                <FeaturePromoCard
                  card={FEATURE_PROMO_CARDS[1]}
                  onActivate={openDocSummaryWidget}
                />
                <DocSummaryWidget
                  isLoggedIn={Boolean(ui.authUser)}
                  highlighted={ui.docWidgetHighlight}
                />
              </section>

              <section className="space-y-4 sm:space-y-5" aria-label="업무 리포트 생성">
                <FeaturePromoCard
                  card={FEATURE_PROMO_CARDS[2]}
                  onActivate={openReportPreviewWidget}
                />
                <WeeklyReportPreviewWidget
                  isLoggedIn={Boolean(ui.authUser)}
                  highlighted={ui.reportWidgetHighlight}
                  onOpenFullReport={() => void openWeeklyReport()}
                />
              </section>
            </div>
          </div>
        </section>

        <HomeCtaSection />
        <HomeFooter />
      </div>

      <WeeklyReportPanel
        open={ui.weeklyReportOpen}
        loading={ui.weeklyReportLoading}
        error={ui.weeklyReportError}
        report={ui.weeklyReport}
        onClose={() =>
          patchUi({
            weeklyReportOpen: false,
            weeklyReportLoading: false,
            weeklyReportError: null,
          })
        }
      />
    </div>
  );
}

function FeaturePromoCard({
  card,
  onActivate,
}: {
  card: (typeof FEATURE_PROMO_CARDS)[number];
  onActivate: () => void;
}) {
  const Icon = card.icon;
  const className =
    "moneo-glass moneo-glow-hover group w-full rounded-2xl p-6 text-left";
  const inner = (
    <>
      <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-500/15 text-indigo-300">
        <Icon size={20} aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-white">{card.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--moneo-muted)]">
        {card.description}
      </p>
    </>
  );
  if (card.href) {
    return (
      <Link href={card.href} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onActivate} className={className}>
      {inner}
    </button>
  );
}

function NetworkDecor() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-40"
      aria-hidden
    >
      <defs>
        <linearGradient id="moneo-edge" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(99,102,241,0)" />
          <stop offset="50%" stopColor="rgba(139,92,246,0.45)" />
          <stop offset="100%" stopColor="rgba(99,102,241,0)" />
        </linearGradient>
      </defs>
      <line x1="8%" y1="22%" x2="28%" y2="40%" stroke="url(#moneo-edge)" strokeWidth="1" />
      <line x1="28%" y1="40%" x2="48%" y2="28%" stroke="url(#moneo-edge)" strokeWidth="1" />
      <line x1="72%" y1="18%" x2="88%" y2="36%" stroke="url(#moneo-edge)" strokeWidth="1" />
      <circle className="animate-moneo-node" cx="8%" cy="22%" r="3" fill="#818cf8" />
      <circle className="animate-moneo-node" cx="28%" cy="40%" r="3.5" fill="#a78bfa" />
      <circle className="animate-moneo-node" cx="48%" cy="28%" r="3" fill="#818cf8" />
      <circle className="animate-moneo-node" cx="88%" cy="36%" r="3" fill="#a78bfa" />
    </svg>
  );
}
