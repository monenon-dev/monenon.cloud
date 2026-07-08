"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  Terminal,
  Bot,
  Menu,
  X,
  Shirt,
  Egg,
  Coffee,
  Music2,
  type LucideIcon,
} from "lucide-react";

import { HomeSidebar } from "@/components/layout/home-sidebar";
import { SecretaryPersona } from "@/components/secretary/secretary-persona";
import { WeatherWidget } from "@/components/weather/weather-widget";
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
  { label: "오늘 옷차림 추천", prompt: "오늘 날씨에 맞는 옷차림을 추천해줘", icon: Shirt },
  { label: "냉장고 파먹기", prompt: "냉장고에 있는 재료로 만들 수 있는 요리를 추천해줘", icon: Egg },
  { label: "오늘의 한마디", prompt: "오늘 날씨에 맞는 한마디를 해줘", icon: Coffee },
  { label: "음악 추천", prompt: "출근길에 듣기 좋은 음악 추천해줘", icon: Music2 },
];

const FEATURE_PROMO_CARDS = [
  {
    icon: "👔",
    title: "오늘의 날씨 코디",
    description:
      "외출하기 전, 오늘 기온과 날씨 조건에 딱 맞는 쾌적하고 스타일리시한 패션 가이드를 확인해 보세요.",
    href: routes.lifestyle.closet,
  },
  {
    icon: "🛒",
    title: "지갑 수호 스마트 장보기",
    description:
      "냉장고 파먹기 후 부족한 재료를 기반으로 마트 장보기 리스트를 자동 생성합니다. 중복 소비를 막아주는 똑똑한 가이드예요.",
    prompt: "냉장고에 있는 재료를 바탕으로 마트 장보기 리스트를 만들어 줘",
  },
  {
    icon: "🎵",
    title: "취향 저격 음악 추천",
    description:
      "비 오는 오늘, 잔잔한 감성을 채워줄 음악은? 출근길·놀러갈 때·요리할 때 상황에 맞는 플레이리스트를 날씨와 취향으로 추천합니다.",
    href: routes.lifestyle.music,
  },
];

export default function MonenonAiApp() {
  const router = useRouter();
  const [showLogs, setShowLogs] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  const navigateToChat = (prompt: string) => {
    const nonce = saveChatStarter(prompt);
    router.push(buildChatsUrl(prompt, nonce));
  };

  const handleRecommendedClick = (label: string, prompt: string) => {
    if (label === "음악 추천") {
      router.push(routes.lifestyle.music);
      return;
    }

    navigateToChat(prompt);
  };

  useEffect(() => {
    const session = getAuthSession();
    if (session) {
      setAuthUser({ nickname: session.nickname, role: session.role });
    }
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    setAuthUser(null);
  };

  return (
    <div className="min-h-dvh flex bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <HomeSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeView={showLogs ? "logs" : null}
        onSelectLogs={() => setShowLogs(true)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md z-20">
          <div className="flex h-14 sm:h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-700 p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900"
                aria-label={sidebarOpen ? "menu close" : "menu open"}
                aria-expanded={sidebarOpen}
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <Link
                href="/"
                className="shrink-0 text-left text-sm sm:text-xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight whitespace-nowrap hover:opacity-90 transition-opacity"
              >
                <span className="lg:hidden">MonenonAI</span>
                <span className="hidden lg:inline">Monenon AI Agent</span>
              </Link>
            </div>
            <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-3">
              {/* 수업중: 모바일에서 숨김 */}
              <Link
                href="/lesson"
                className="hidden sm:inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-950/60 transition-colors"
              >
                수업중
              </Link>
              {authUser ? (
                <>
                  <Link
                    href={routes.oauth.mypage}
                    className="text-sm font-medium text-indigo-600 dark:text-indigo-400 px-1 sm:px-2 hover:underline truncate max-w-[80px] sm:max-w-none"
                  >
                    {authUser.nickname}님
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href={routes.oauth.login}
                    className="inline-flex items-center px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    로그인
                  </Link>
                  <Link
                    href={routes.oauth.signup}
                    className="inline-flex items-center px-2.5 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                  >
                    회원가입
                  </Link>
                </>
              )}
            </div>
          </div>
        </header>

        <section className="border-b border-gray-200/80 dark:border-gray-800 bg-gradient-to-b from-indigo-50/90 via-white to-white dark:from-indigo-950/40 dark:via-gray-950 dark:to-gray-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
              <div className="min-w-0 flex-1 max-w-3xl">
                <SecretaryPersona
                  apiBaseUrl={apiBaseUrl}
                  nickname={authUser?.nickname ?? null}
                />
              </div>
              <WeatherWidget
                apiBaseUrl={apiBaseUrl}
                variant="hero"
                className="mx-auto lg:mx-0 lg:shrink-0 lg:mt-10"
              />
            </div>

            <div className="mt-6 sm:mt-8" aria-label="보기 전환">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={routes.lifestyle.chats}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-indigo-600 bg-indigo-600 text-white text-sm font-medium shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-colors"
                >
                  <Bot size={18} />
                  <span>에이전트 채팅</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowLogs((v) => !v)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                    showLogs
                      ? "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                      : "border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-900/80 text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-800"
                  }`}
                >
                  <Terminal size={18} />
                  <span>실행 로그</span>
                </button>
              </div>
              <div className="mt-[1cm] flex flex-wrap gap-1.5" aria-label="추천 태그">
                  {RECOMMENDED_TAGS.map(({ label, prompt, icon: Icon }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleRecommendedClick(label, prompt)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-indigo-50/90 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition-colors hover:border-indigo-500 hover:bg-indigo-100/90 dark:bg-indigo-950/50 dark:text-gray-200 dark:hover:border-indigo-400 dark:hover:bg-indigo-950/80"
                    >
                      <Icon size={14} className="shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden />
                      <span>{label}</span>
                    </button>
                  ))}
              </div>

              <div
                className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
                aria-label="기능 소개"
              >
                {FEATURE_PROMO_CARDS.map((card) => {
                  const { icon, title, description } = card;
                  const href = "href" in card ? card.href : undefined;
                  const prompt = "prompt" in card ? card.prompt : undefined;
                  const className =
                    "group w-full rounded-2xl border border-gray-200 bg-white p-6 text-left shadow-sm transition-all hover:-translate-y-1 hover:border-indigo-100 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-800";
                  const inner = (
                    <>
                      <div className="mb-4">
                        <span
                          className="text-2xl leading-none transition-all group-hover:scale-110"
                          aria-hidden
                        >
                          {icon}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        {title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                        {description}
                      </p>
                    </>
                  );
                  if (href) {
                    return (
                      <Link key={title} href={href} className={className}>
                        {inner}
                      </Link>
                    );
                  }
                  return (
                    <button
                      key={title}
                      type="button"
                      onClick={() => prompt && navigateToChat(prompt)}
                      className={className}
                    >
                      {inner}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {showLogs && (
          <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:pb-12 lg:px-8">
            <MonenonLogPage />
          </div>
        )}
      </div>
    </div>
  );
}

function MonenonLogPage() {
  const [logs, setLogs] = useState<AgentLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/agent/logs`);
      const result = await res.json();
      setLogs(result);
    } catch (err) {
      console.error("Logs fetch error", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="flex w-full max-w-6xl flex-col space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-mono text-indigo-600 dark:text-indigo-400">
          Trace: {logs.length} operations
        </p>
        <button
          type="button"
          onClick={fetchLogs}
          className="p-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          aria-label="새로고침"
        >
          <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="space-y-3 max-h-[min(70vh,48rem)] overflow-y-auto font-mono pr-1">
        {logs.map((log, idx) => (
          <article key={idx} className="border dark:border-gray-800 rounded-xl p-3 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Step #{idx + 1}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 text-xs">
              {Object.entries(log).map(([key, value]) => (
                <div key={key} className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1">
                  <span className="text-gray-500">{key}</span>
                  <span className="text-gray-900 dark:text-gray-200 font-medium">{String(value)}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
