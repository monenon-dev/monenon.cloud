"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Database,
  RefreshCw,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { ChatSessionsTable } from "@/components/chat/chat-sessions-table";
import {
  PlatformSidebarLayout,
  PLATFORM_NAV,
  type PlatformSection,
} from "@/components/layout/platform-sidebar-layout";

import { getApiBaseUrl } from "@/lib/api-base";
import { routes } from "@/lib/routes";

const apiBaseUrl = getApiBaseUrl();

interface TableCount {
  key: string;
  label: string;
  table_name: string;
  count: number;
  category: string;
  description: string;
}

interface PlatformOverview {
  tables: TableCount[];
  total_records: number;
}

const SECTION_DESCRIPTIONS: Record<Exclude<PlatformSection, "users">, string> = {
  overview: "전체 테이블 현황과 Neon DB 연결 상태를 확인합니다.",
  user_settings: "관리자가 회원별 취향 설정(user_settings)을 조회합니다.",
  closet: "등록한 옷과 오늘 날씨에 맞는 코디를 확인합니다.",
  refrigerator: "식재료·유통기한·날씨·선호 메뉴를 정리합니다.",
  music: "출근·외출·요리 상황별 음악 추천 — /music 페이지",
  chat_sessions: "채팅방 세션 (레거시 URL 호환).",
};

const VALID_SECTIONS = new Set<PlatformSection>([
  "overview",
  "user_settings",
  "closet",
  "refrigerator",
  "music",
  "chat_sessions",
]);

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<PlatformSection>("overview");
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/platform/overview`);
      if (!res.ok) throw new Error("개요를 불러오지 못했습니다.");
      setOverview(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    const section = searchParams.get("section");
    if (section === "users") {
      router.replace(routes.oauth.admin.root);
      return;
    }
    // 구 메뉴 "에이전트 채팅방"(messages) → 에이전트 채팅으로 통합
    if (section === "messages") {
      router.replace(routes.lifestyle.chats);
      return;
    }
    if (section && VALID_SECTIONS.has(section as PlatformSection)) {
      setActiveSection(section as PlatformSection);
    }
  }, [router, searchParams]);

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      const res = await fetch(`${apiBaseUrl}/platform/seed-demo`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(data.detail || "샘플 데이터 생성 실패");
        return;
      }
      await fetchOverview();
    } catch {
      alert("샘플 데이터 요청 실패");
    } finally {
      setSeeding(false);
    }
  };

  const activeTable =
    activeSection === "overview"
      ? null
      : overview?.tables.find((t) => t.key === activeSection);

  const activeNavItem = PLATFORM_NAV.flatMap((g) => g.items).find(
    (i) => i.id === activeSection
  );

  const headerActions = (
    <>
      <button
        type="button"
        onClick={fetchOverview}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-900"
      >
        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        <span className="hidden sm:inline">새로고침</span>
      </button>
      <button
        type="button"
        onClick={handleSeedDemo}
        disabled={seeding}
        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
      >
        <Sparkles size={14} />
        <span className="hidden sm:inline">샘플</span>
      </button>
    </>
  );

  return (
    <PlatformSidebarLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      headerActions={headerActions}
    >
      {error && (
        <p className="mb-6 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-4 py-3">
          {error} — 백엔드(uvicorn)가 실행 중인지 확인하세요.
        </p>
      )}

      {activeSection === "overview" ? (
        <OverviewPanel overview={overview} loading={loading} />
      ) : activeSection === "user_settings" ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-indigo-100 p-3 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              <Settings size={24} aria-hidden />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">취향 설정</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {SECTION_DESCRIPTIONS.user_settings}
              </p>
              <Link
                href={routes.oauth.admin.userSettings}
                className="mt-4 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                관리자 설정 조회 화면 열기
              </Link>
            </div>
          </div>
        </div>
      ) : activeSection === "chat_sessions" ? (
        <ChatSessionsTable apiBaseUrl={apiBaseUrl} />
      ) : (
        <FeaturePanel
          title={activeNavItem?.label ?? activeSection}
          tableName={activeTable?.table_name ?? activeSection}
          description={SECTION_DESCRIPTIONS[activeSection as Exclude<PlatformSection, "users">]}
          count={activeTable?.count ?? 0}
          category={activeTable?.category ?? ""}
          icon={activeNavItem?.icon}
          loading={loading}
          pageHref={
            activeSection === "closet"
              ? routes.lifestyle.closet
              : activeSection === "refrigerator"
                ? routes.lifestyle.refrigerator
                : activeSection === "music"
                  ? routes.lifestyle.music
                  : undefined
          }
        />
      )}
    </PlatformSidebarLayout>
  );
}

function DashboardFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
      대시보드를 불러오는 중…
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardContent />
    </Suspense>
  );
}

function OverviewPanel({
  overview,
  loading,
}: {
  overview: PlatformOverview | null;
  loading: boolean;
}) {
  const categories = overview
    ? [...new Set(overview.tables.map((t) => t.category))]
    : [];

  return (
    <>
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-2">
          <Database size={16} />
          Neon PostgreSQL
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">플랫폼 개요</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
          행버거 버튼으로 왼쪽 메뉴를 열고 기능별 테이블을 선택하세요. 다시 누르면 사이드바가 닫혀 콘텐츠 공간이 넓어집니다.
        </p>
      </div>

      {overview && (
        <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="테이블 수" value={String(overview.tables.length)} />
          <StatCard label="총 레코드" value={String(overview.total_records)} />
          <StatCard label="연결" value="OK" accent="text-green-600 dark:text-green-400" />
          <StatCard label="DB" value="Neon" />
        </div>
      )}

      {loading && !overview && <p className="text-sm text-gray-500">불러오는 중…</p>}

      {categories.map((category) => {
        const items = overview?.tables.filter((t) => t.category === category) ?? [];
        return (
          <section key={category} className="mb-8">
            <h2 className="text-lg font-semibold mb-3">{category}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((table) => (
                <div
                  key={table.key}
                  className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-4"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-sm font-medium">{table.label}</span>
                    <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                      {table.count}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">{table.description}</p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}

function FeaturePanel({
  title,
  tableName,
  description,
  count,
  category,
  icon: Icon,
  loading,
  pageHref,
}: {
  title: string;
  tableName: string;
  description: string;
  count: number;
  category: string;
  icon?: LucideIcon;
  loading: boolean;
  pageHref?: string;
}) {
  return (
    <div className="max-w-3xl">
      <div className="flex items-start gap-4 mb-6">
        {Icon && (
          <div className="rounded-xl bg-indigo-100 dark:bg-indigo-950 p-3 text-indigo-600 dark:text-indigo-400">
            <Icon size={28} />
          </div>
        )}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{category}</p>
          <h1 className="text-2xl sm:text-3xl font-bold font-mono">{title}</h1>
          <p className="mt-1 text-sm text-gray-500 font-mono">{tableName}</p>
        </div>
      </div>

      <p className="text-gray-600 dark:text-gray-400 leading-relaxed mb-8">{description}</p>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 p-6 sm:p-8">
        <p className="text-sm text-gray-500 mb-1">현재 레코드 수</p>
        {loading ? (
          <p className="text-gray-400">로딩 중…</p>
        ) : (
          <p className="text-5xl font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
            {count}
          </p>
        )}
        <p className="mt-4 text-sm text-gray-500">
          Neon 콘솔의 <span className="font-mono">{tableName}</span> 테이블과 동기화됩니다.
        </p>
        {pageHref && (
          <Link
            href={pageHref}
            className="mt-6 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            {title} 페이지 열기
          </Link>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 px-4 py-3">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent ?? ""}`}>{value}</p>
    </div>
  );
}
