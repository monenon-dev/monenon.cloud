"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
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
import { HomeSidebar } from "@/components/layout/home-sidebar";
import { clearAuthSession, getAuthSession } from "@/lib/auth-api";
import { getApiBaseUrl } from "@/lib/api-base";
import { buildChatsUrl, saveChatStarter } from "@/lib/chat-starter";
import { routes } from "@/lib/routes";

const apiBaseUrl = getApiBaseUrl();

interface AgentLogItem {
  [key: string]: string | number | boolean | null;
}

type AuthUser = { nickname: string; role: string };

const RECOMMENDED_TAGS: { label: string; prompt: string; icon: LucideIcon }[] = [
  {
    label: "오늘의 업무 브리핑",
    prompt: "오늘 일정과 할 일 기준으로 업무 브리핑을 작성해 줘",
    icon: BriefcaseBusiness,
  },
  {
    label: "문서/자료 정리",
    prompt: "흩어진 문서와 자료를 주제별로 정리해 줘",
    icon: Files,
  },
  {
    label: "업무 리포트 생성",
    prompt: "이번 주 업무 진행 상황을 리포트로 정리해 줘",
    icon: FileBarChart,
  },
];

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

export default function MoneoHomePage() {
  const router = useRouter();
  const [ui, setUi] = useState({
    showLogs: false,
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
    <div className="relative min-h-dvh flex moneo-grid-bg text-[var(--moneo-text)]">
      <div className="moneo-noise pointer-events-none absolute inset-0" aria-hidden />
      <NetworkDecor />

      <HomeSidebar
        open={ui.sidebarOpen}
        onClose={() => patchUi({ sidebarOpen: false })}
        activeView={ui.showLogs ? "logs" : null}
        onSelectLogs={() => patchUi({ showLogs: true })}
      />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-white/10 bg-[rgba(10,10,15,0.82)] backdrop-blur-md z-20">
          <div className="flex h-14 sm:h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
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
                className="shrink-0 text-left text-lg sm:text-xl font-semibold tracking-tight text-white hover:opacity-90 transition-opacity"
              >
                Moneo
              </Link>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2">
              {ui.authUser ? (
                <>
                  <Link
                    href={routes.oauth.mypage}
                    className="text-sm font-medium text-indigo-300 px-1 sm:px-2 hover:underline truncate max-w-[80px] sm:max-w-none"
                  >
                    {ui.authUser.nickname}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg border border-white/10 bg-white/5 text-indigo-100 hover:bg-white/10 transition-colors"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={routes.oauth.login}
                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg border border-white/10 bg-white/5 text-indigo-100 hover:bg-white/10 transition-colors"
                  >
                    로그인
                    <span className="hidden sm:inline-flex rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-200/90">
                      수업중
                    </span>
                  </Link>
                  <Link
                    href={routes.oauth.signup}
                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)] hover:bg-indigo-400 transition-colors"
                  >
                    회원가입
                    <span className="sm:hidden rounded border border-white/20 bg-white/10 px-1 py-0.5 text-[10px] font-medium text-white/90">
                      수업
                    </span>
                  </Link>
                </>
              )}
              {ui.authUser ? (
                <Link
                  href="/lesson"
                  className="hidden sm:inline-flex items-center rounded border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] font-medium text-amber-200/90 hover:bg-amber-400/15"
                >
                  수업중
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        <section className="relative border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
              <div className="min-w-0">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-indigo-300/80">
                  AI agents for work
                </p>
                <h1 className="mt-3 text-4xl sm:text-5xl lg:text-[3.25rem] font-semibold tracking-tight text-white leading-[1.08]">
                  Moneo
                </h1>
                <p className="mt-4 max-w-md text-base sm:text-lg text-[var(--moneo-muted)] leading-relaxed">
                  AI Agents, Orchestrated for Work
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href={routes.lifestyle.chats}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 text-white text-sm font-medium shadow-[0_0_28px_rgba(99,102,241,0.4)] hover:bg-indigo-400 transition-colors"
                  >
                    <Bot size={18} />
                    에이전트 채팅
                  </Link>
                  <button
                    type="button"
                    onClick={() => patchUi({ showLogs: !ui.showLogs })}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                      ui.showLogs
                        ? "border-indigo-400/50 bg-indigo-500/20 text-indigo-100"
                        : "border-white/10 bg-white/5 text-indigo-100 hover:border-indigo-400/30"
                    }`}
                  >
                    <Terminal size={18} />
                    Agent 히스토리
                  </button>
                </div>
              </div>

              <AgentPreview className="w-full" />
            </div>

            <div className="mt-10 flex flex-wrap gap-2" aria-label="추천 작업">
              {RECOMMENDED_TAGS.map(({ label, prompt, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => navigateToChat(prompt)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-indigo-100/90 transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/10"
                >
                  <Icon size={14} className="shrink-0 text-indigo-300" aria-hidden />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div
              className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5"
              aria-label="기능 소개"
            >
              {FEATURE_PROMO_CARDS.map((card) => {
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

        {ui.showLogs && (
          <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:pb-12 lg:px-8">
            <AgentHistoryPanel />
          </div>
        )}
      </div>
    </div>
  );
}

function NetworkDecor() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-0 h-full w-full opacity-40"
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

function AgentHistoryPanel() {
  const [state, setState] = useState({
    logs: [] as AgentLogItem[],
    isLoading: false,
  });

  const patch = (p: Partial<typeof state>) =>
    setState((prev) => ({ ...prev, ...p }));

  const fetchLogs = async () => {
    patch({ isLoading: true });
    try {
      const res = await fetch(`${apiBaseUrl}/agent/logs`);
      const result = await res.json();
      patch({ logs: Array.isArray(result) ? result : [] });
    } catch (err) {
      console.error("Logs fetch error", err);
    } finally {
      patch({ isLoading: false });
    }
  };

  useEffect(() => {
    void fetchLogs();
  }, []);

  return (
    <div className="flex w-full max-w-6xl flex-col space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Agent 작업 히스토리</h2>
          <p className="mt-1 font-mono text-xs text-indigo-300/80">
            stream · {state.logs.length} events
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchLogs()}
          className="p-2 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="새로고침"
        >
          <RefreshCw size={16} className={state.isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="space-y-3 max-h-[min(70vh,48rem)] overflow-y-auto font-mono pr-1">
        {state.logs.map((log, idx) => {
          const ts =
            log.timestamp ?? log.created_at ?? log.time ?? log.ts ?? null;
          const tool = log.tool ?? log.name ?? log.action ?? null;
          const status = log.status ?? log.state ?? "ok";
          return (
            <article
              key={idx}
              className="moneo-glass rounded-xl p-3 border-white/10"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className={`size-2 rounded-full ${
                    String(status).toLowerCase().includes("fail") ||
                    String(status).toLowerCase().includes("error")
                      ? "bg-rose-400"
                      : String(status).toLowerCase().includes("run")
                        ? "bg-amber-400 animate-pulse"
                        : "bg-emerald-400"
                  }`}
                />
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300/70">
                  step #{idx + 1}
                </span>
                {ts != null && (
                  <span className="text-[10px] text-indigo-200/50">{String(ts)}</span>
                )}
                {tool != null && (
                  <span className="rounded border border-indigo-400/25 bg-indigo-500/10 px-1.5 py-0.5 text-[10px] text-indigo-200">
                    {String(tool)}
                  </span>
                )}
                <span className="text-[10px] text-indigo-200/60">
                  status={String(status)}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs">
                {Object.entries(log).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between gap-4 border-b border-white/5 pb-1"
                  >
                    <span className="text-indigo-200/45">{key}</span>
                    <span className="text-right text-indigo-50/90 font-medium break-all">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
        {!state.isLoading && state.logs.length === 0 && (
          <p className="text-sm text-[var(--moneo-muted)]">
            아직 기록된 Agent 작업이 없습니다. 채팅을 실행하면 여기에 스트림됩니다.
          </p>
        )}
      </div>
    </div>
  );
}
