"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AdminSidebarLayout } from "@/components/admin/admin-sidebar-layout";
import {
  type AdminDashboardOverview,
  fetchAdminDashboard,
  markAdminRiskProcessed,
} from "@/lib/admin-api";
import { clearAdminSession, getAdminNickname, isSessionAdmin } from "@/lib/session-user";
import { routes } from "@/lib/routes";

const PIE_COLORS = ["#4f46e5", "#7c3aed", "#2563eb", "#0891b2", "#059669", "#d97706", "#9ca3af"];

function formatShortDate(value: string): string {
  const [, month, day] = value.split("-");
  return month && day ? `${month}/${day}` : value;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isSessionAdmin()) {
      router.replace(`${routes.oauth.admin.login}?reason=not_admin`);
    }
  }, [mounted, router]);

  const load = useCallback(async () => {
    if (!isSessionAdmin()) return;
    setLoading(true);
    setError(null);
    try {
      setOverview(await fetchAdminDashboard());
    } catch (e) {
      setError(e instanceof Error ? e.message : "대시보드를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted && isSessionAdmin()) {
      void load();
    }
  }, [mounted, load]);

  const handleMarkProcessed = async (warningId: number) => {
    setProcessingId(warningId);
    try {
      await markAdminRiskProcessed(warningId);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리 완료에 실패했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  if (!mounted || !isSessionAdmin()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="size-8 animate-spin text-violet-600" aria-label="불러오는 중" />
      </main>
    );
  }

  const modelData = overview?.model_usage ?? [];
  const apiData =
    overview?.api_calls_daily.map((row) => ({
      ...row,
      label: formatShortDate(row.date),
    })) ?? [];

  return (
    <AdminSidebarLayout
      activeSection="dashboard"
      adminNickname={getAdminNickname()}
      onLogout={() => {
        clearAdminSession();
        router.replace(routes.oauth.admin.login);
      }}
      headerActions={
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-900"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          새로고침
        </button>
      }
    >
      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {overview && overview.unprocessed_risk_count > 0 && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/40">
          <div className="mb-3 flex items-center gap-2 text-amber-900 dark:text-amber-100">
            <AlertTriangle size={18} aria-hidden />
            <h2 className="font-semibold">
              미처리 위험 계정 {overview.unprocessed_risk_count}건
            </h2>
          </div>
          <ul className="space-y-3">
            {overview.risky_accounts.map((risk) => (
              <li
                key={risk.warning_id}
                className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900 dark:bg-gray-900"
              >
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {risk.nickname}{" "}
                    <span className="text-sm font-normal text-gray-500">({risk.email})</span>
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{risk.message}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={routes.oauth.admin.root}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                  >
                    회원 관리
                  </Link>
                  <button
                    type="button"
                    disabled={processingId === risk.warning_id}
                    onClick={() => void handleMarkProcessed(risk.warning_id)}
                    className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                  >
                    {processingId === risk.warning_id ? "처리 중…" : "처리 완료"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            AI 모델 선호도
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            user_settings 기준 회원별 선호 모델 분포
          </p>
          <div className="mt-6 h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                불러오는 중…
              </div>
            ) : modelData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                데이터가 없습니다.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modelData}
                    dataKey="count"
                    nameKey="model"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ model, count }) => `${model} (${count})`}
                  >
                    {modelData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">API 호출 추이</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            최근 14일 assistant 메시지 수 (API 호출 추정)
            {overview ? ` · 합계 ${overview.total_api_calls}회` : ""}
          </p>
          <div className="mt-6 h-64">
            {loading ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                불러오는 중…
              </div>
            ) : apiData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                데이터가 없습니다.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={apiData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} name="호출 수" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
    </AdminSidebarLayout>
  );
}
