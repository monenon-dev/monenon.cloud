"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Terminal,
  Bot,
  Menu,
  X,
  BriefcaseBusiness,
  Files,
  FileBarChart,
  type LucideIcon,
} from "lucide-react";

import { AgentPreview } from "@/components/home/agent-preview";
import { BuiltWithSection } from "@/components/home/built-with-section";
import { HomeCtaSection } from "@/components/home/home-cta-section";
import { HomeFooter } from "@/components/home/home-footer";
import { HomeSidebar } from "@/components/layout/home-sidebar";
import { clearAuthSession, getAuthSession } from "@/lib/auth-api";
import { buildChatsUrl, saveChatStarter } from "@/lib/chat-starter";
import { routes } from "@/lib/routes";

type AuthUser = { nickname: string; role: string };

const FEATURE_PROMO_CARDS: {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  prompt?: string;
}[] = [
  {
    icon: BriefcaseBusiness,
    title: "오늘의 업무 브리핑",
    description:
      "일정·할 일·최근 대화를 묶어 하루를 시작하는 브리핑을 에이전트가 조립합니다.",
    prompt: "오늘 일정과 할 일 기준으로 업무 브리핑을 작성해 줘",
  },
  {
    icon: Files,
    title: "문서/자료 정리",
    description:
      "흩어진 노트와 파일을 주제·우선순위로 묶고, 다음에 손댈 작업을 제안합니다.",
    prompt: "흩어진 문서와 자료를 주제별로 정리해 줘",
  },
  {
    icon: FileBarChart,
    title: "업무 리포트 생성",
    description:
      "진행 현황·리스크·다음 액션을 한 페이지 리포트로 뽑아 공유 준비를 마칩니다.",
    prompt: "이번 주 업무 진행 상황을 리포트로 정리해 줘",
  },
];

/** Shared content width — keeps layout stable past ~1280–1440px viewports */
const PAGE_SHELL = "mx-auto w-full max-w-6xl xl:max-w-7xl px-4 sm:px-6 lg:px-8";

export default function MoneoHomePage() {
  const router = useRouter();
  const [ui, setUi] = useState({
    sidebarOpen: false,
    authUser: null as AuthUser | null,
  });

  const patchUi = (patch: Partial<typeof ui>) =>
    setUi((prev) => ({ ...prev, ...patch }));

  const navigateToChat = (prompt: string) => {
    const nonce = saveChatStarter(prompt);
    router.push(buildChatsUrl(prompt, nonce));
  };

  useEffect(() => {
    const session = getAuthSession();
    if (session) {
      patchUi({ authUser: { nickname: session.nickname, role: session.role } });
    }
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    patchUi({ authUser: null });
  };

  return (
    <div className="relative flex min-h-dvh items-start moneo-grid-bg text-[var(--moneo-text)] lg:h-dvh lg:overflow-hidden">
      <div className="moneo-noise pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <NetworkDecor />

      <HomeSidebar
        open={ui.sidebarOpen}
        onClose={() => patchUi({ sidebarOpen: false })}
      />

      <div className="relative z-10 flex w-full min-w-0 flex-1 flex-col lg:h-full lg:min-h-0 lg:overflow-hidden">
        <header className="sticky top-0 z-20 shrink-0 border-b border-white/10 bg-[rgba(10,10,15,0.82)] backdrop-blur-md lg:static">
          <div className={`${PAGE_SHELL} flex h-14 items-center justify-between gap-4 sm:h-16`}>
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => patchUi({ sidebarOpen: !ui.sidebarOpen })}
                className="inline-flex items-center justify-center rounded-lg border border-white/10 p-2 text-indigo-100 hover:bg-white/5"
                aria-label={ui.sidebarOpen ? "menu close" : "menu open"}
                aria-expanded={ui.sidebarOpen}
              >
                {ui.sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <Link
                href="/"
                className="shrink-0 text-left text-lg font-semibold tracking-tight text-white transition-opacity hover:opacity-90 sm:text-xl"
              >
                Moneo
              </Link>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
              {ui.authUser ? (
                <>
                  <Link
                    href={routes.oauth.mypage}
                    className="max-w-[80px] truncate px-1 text-sm font-medium text-indigo-300 hover:underline sm:max-w-none sm:px-2"
                  >
                    {ui.authUser.nickname}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-medium text-indigo-100 transition-colors hover:bg-white/10 sm:px-3 sm:text-sm"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={routes.oauth.login}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs font-medium text-indigo-100 transition-colors hover:bg-white/10 sm:px-3 sm:text-sm"
                  >
                    로그인
                    <span className="hidden rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-200/90 sm:inline-flex">
                      수업중
                    </span>
                  </Link>
                  <Link
                    href={routes.oauth.signup}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500 px-2.5 py-2 text-xs font-medium text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] transition-colors hover:bg-indigo-400 sm:px-3 sm:text-sm"
                  >
                    회원가입
                    <span className="rounded border border-white/20 bg-white/10 px-1 py-0.5 text-[10px] font-medium text-white/90 sm:hidden">
                      수업
                    </span>
                  </Link>
                </>
              )}
              {ui.authUser ? (
                <Link
                  href="/lesson"
                  className="hidden items-center rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] font-medium text-amber-200/90 hover:bg-amber-400/15 sm:inline-flex"
                >
                  수업중
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        {/* Desktop: snap scroller below header. Mobile: normal document flow. */}
        <div className="home-snap-scroller min-h-0 flex-1">
          {/* Section 1 — hero + preview + feature cards */}
          <section
            className="home-snap-panel home-snap-panel--primary relative"
            aria-label="소개"
          >
            <div
              className={`${PAGE_SHELL} flex h-full min-h-0 flex-col py-6 sm:py-8 lg:gap-5 lg:py-3 xl:gap-6 xl:py-4`}
            >
              <div className="grid min-h-0 flex-[1.05] items-start gap-5 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] lg:gap-8 xl:gap-10">
                <div className="min-w-0 lg:pt-1">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-indigo-300/80 lg:text-[11px]">
                    AI agents for work
                  </p>
                  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white leading-[1.08] sm:text-4xl lg:mt-2 lg:text-[2.65rem] xl:text-[3rem]">
                    Moneo
                  </h1>
                  <p className="mt-2.5 max-w-md text-sm leading-relaxed text-[var(--moneo-muted)] sm:text-base lg:mt-3">
                    AI Agents, Orchestrated for Work
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-2.5 lg:mt-5 lg:gap-3">
                    <Link
                      href={routes.lifestyle.chats}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-[0_0_28px_rgba(99,102,241,0.4)] transition-colors hover:bg-indigo-400 lg:px-5 lg:py-2.5"
                    >
                      <Bot size={18} />
                      에이전트 채팅
                    </Link>
                    <Link
                      href={routes.agent.history}
                      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-indigo-100 transition-colors hover:border-indigo-400/30 lg:px-5 lg:py-2.5"
                    >
                      <Terminal size={18} />
                      Agent 히스토리
                    </Link>
                  </div>
                </div>

                <div className="flex min-h-0 w-full items-stretch">
                  <AgentPreview className="w-full" />
                </div>
              </div>

              <div
                className="mt-6 grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-3 md:gap-4 lg:mt-0 lg:gap-4"
                aria-label="기능 소개"
              >
                {FEATURE_PROMO_CARDS.map((card) => {
                  const Icon = card.icon;
                  const className =
                    "moneo-glass moneo-glow-hover group flex h-full min-h-[8.5rem] w-full flex-col rounded-2xl p-5 text-left lg:min-h-0 lg:p-5 xl:min-h-[9.5rem] xl:p-6";
                  const inner = (
                    <>
                      <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-500/15 text-indigo-300">
                        <Icon size={20} aria-hidden />
                      </div>
                      <h3 className="text-base font-semibold text-white">
                        {card.title}
                      </h3>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--moneo-muted)] lg:line-clamp-3">
                        {card.description}
                      </p>
                    </>
                  );
                  if (card.href) {
                    return (
                      <Link key={card.title} href={card.href} className={className}>
                        {inner}
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={card.title}
                      type="button"
                      onClick={() => card.prompt && navigateToChat(card.prompt)}
                      className={className}
                    >
                      {inner}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Section 2 — Built With + CTA + Footer */}
          <section
            className="home-snap-panel home-snap-panel--secondary relative flex flex-col"
            aria-label="기술 스택과 시작하기"
          >
            <div
              className={`${PAGE_SHELL} flex min-h-0 flex-1 flex-col justify-center gap-4 py-10 sm:py-12 lg:gap-3 lg:py-5 xl:py-6`}
            >
              <BuiltWithSection compact className="lg:shrink-0" />
            </div>
            <div className="mt-auto shrink-0">
              <HomeCtaSection compact />
              <HomeFooter compact />
            </div>
          </section>
        </div>
      </div>
    </div>
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
