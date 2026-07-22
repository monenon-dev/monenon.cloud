"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  Loader2,
  Plus,
  Refrigerator as RefrigeratorIcon,
  Settings,
  Trash2,
} from "lucide-react";

import { WeatherWidget } from "@/components/weather/weather-widget";
import { getChatUserId } from "@/lib/chat-user";
import {
  createRefrigeratorItem,
  deleteRefrigeratorItem,
  expiryBadge,
  fetchRefrigeratorOverview,
  type RefrigeratorOverview,
} from "@/lib/refrigerator-api";

import { getApiBaseUrl } from "@/lib/api-base";
import { routes } from "@/lib/routes";

const apiBaseUrl = getApiBaseUrl();

type UiState = {
  loading: boolean;
  error: string | null;
  adding: boolean;
  name: string;
  quantity: string;
  expiry_date: string;
};

function PageFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <Loader2 className="size-8 animate-spin text-sky-600" aria-label="불러오는 중" />
    </main>
  );
}

export default function RefrigeratorPage() {
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [overview, setOverview] = useState<RefrigeratorOverview | null>(null);
  const [ui, setUi] = useState<UiState>({
    loading: true,
    error: null,
    adding: false,
    name: "",
    quantity: "",
    expiry_date: "",
  });

  const patchUi = (p: Partial<UiState>) => setUi((prev) => ({ ...prev, ...p }));

  useEffect(() => {
    setMounted(true);
    setUserId(getChatUserId());
  }, []);

  const load = useCallback(async () => {
    if (!userId) {
      setOverview(null);
      patchUi({ loading: false, error: null });
      return;
    }
    patchUi({ loading: true, error: null });
    try {
      setOverview(await fetchRefrigeratorOverview(userId, apiBaseUrl));
    } catch (e) {
      setOverview(null);
      patchUi({ error: e instanceof Error ? e.message : "불러오기 실패" });
    } finally {
      patchUi({ loading: false });
    }
  }, [userId]);

  useEffect(() => {
    if (!mounted) return;
    void load();
  }, [mounted, load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !ui.name.trim()) return;
    patchUi({ adding: true, error: null });
    try {
      await createRefrigeratorItem(
        userId,
        {
          name: ui.name.trim(),
          quantity: ui.quantity.trim() || undefined,
          expiry_date: ui.expiry_date || undefined,
        },
        apiBaseUrl
      );
      patchUi({ name: "", quantity: "", expiry_date: "", adding: false });
      await load();
    } catch (err) {
      patchUi({
        adding: false,
        error: err instanceof Error ? err.message : "등록 실패",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!userId) return;
    try {
      await deleteRefrigeratorItem(userId, id, apiBaseUrl);
      await load();
    } catch (err) {
      patchUi({ error: err instanceof Error ? err.message : "삭제 실패" });
    }
  };

  if (!mounted) {
    return <PageFallback />;
  }

  if (!userId) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-12 dark:bg-gray-950">
        <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50/80 p-8 text-center dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm">로그인 후 냉장고를 사용할 수 있습니다.</p>
          <Link href={routes.oauth.login} className="mt-4 inline-block rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white">
            로그인
          </Link>
        </div>
      </main>
    );
  }

  const avoided = overview?.prefs?.avoided_ingredients ?? [];
  const weatherFoods = overview?.weather_foods ?? [];
  const preferredFoods = overview?.preferred_foods ?? [];
  const items = overview?.items ?? [];
  const expiringSoon = overview?.expiring_soon ?? [];

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
          <Link href="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-400">
            <ArrowLeft size={20} />
          </Link>
          <RefrigeratorIcon className="text-sky-600" size={22} />
          <h1 className="flex-1 text-lg font-bold text-gray-900 dark:text-white">냉장고</h1>
          <Link
            href={routes.oauth.mypagePreferences}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="선호도 설정"
          >
            <Settings size={20} />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        {ui.error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {ui.error}
          </p>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {overview?.summary ?? "식재료와 오늘의 메뉴를 정리합니다."}
          </p>
          <WeatherWidget apiBaseUrl={apiBaseUrl} variant="compact" />
        </div>

        {ui.loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-8 animate-spin text-indigo-600" />
          </div>
        ) : overview ? (
          <>
            {expiringSoon.length > 0 && (
              <section className="rounded-2xl border border-orange-200 bg-orange-50/60 p-5 dark:border-orange-900 dark:bg-orange-950/30">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-orange-800 dark:text-orange-200">
                  <AlertTriangle size={18} />
                  유통기한 임박
                </h2>
                <ul className="space-y-2">
                  {expiringSoon.map((item) => {
                    const badge = expiryBadge(item.expiry_status);
                    return (
                      <li
                        key={item.id}
                        className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 dark:bg-gray-900"
                      >
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {item.expiry_date ?? "날짜 없음"}
                            {item.quantity ? ` · ${item.quantity}` : ""}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}>
                          {badge.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <section className="rounded-2xl border border-sky-200 bg-sky-50/50 p-5 dark:border-sky-900 dark:bg-sky-950/30">
              <h2 className="mb-3 text-sm font-semibold text-sky-800 dark:text-sky-200">
                오늘 날씨에 어울리는 메뉴
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {weatherFoods.map((food, i) => (
                  <li
                    key={`${food.name}-${i}`}
                    className="rounded-xl bg-white px-3 py-2.5 text-sm shadow-sm dark:bg-gray-900"
                  >
                    <p className="font-medium text-gray-900 dark:text-white">{food.name}</p>
                    <p className="text-xs text-gray-500">{food.reason}</p>
                  </li>
                ))}
              </ul>
            </section>

            {preferredFoods.length > 0 && (
              <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/40">
                <h2 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">선호 메뉴 성향</h2>
                <div className="flex flex-wrap gap-2">
                  {preferredFoods.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {avoided.length > 0 && (
                  <p className="mt-3 text-xs text-gray-500">피하는 재료: {avoided.join(", ")}</p>
                )}
              </section>
            )}

            <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/40">
              <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
                보관 중 ({items.length})
              </h2>
              {items.length === 0 ? (
                <p className="text-sm text-gray-500">식재료를 등록해 보세요.</p>
              ) : (
                <ul className="space-y-2">
                  {items.map((item) => {
                    const badge = expiryBadge(item.expiry_status);
                    return (
                      <li
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-2 dark:border-gray-800"
                      >
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {item.expiry_date ? `유통기한 ${item.expiry_date}` : "유통기한 미입력"}
                            {item.quantity ? ` · ${item.quantity}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${badge.className}`}>
                            {badge.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            className="rounded p-1 text-gray-400 hover:text-red-600"
                            aria-label="삭제"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/80 p-5 dark:border-gray-700 dark:bg-gray-900/30">
              <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">식재료 등록</h2>
              <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
                <input
                  value={ui.name}
                  onChange={(e) => patchUi({ name: e.target.value })}
                  placeholder="예: 두부, 우유"
                  className="min-w-[120px] flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                  required
                />
                <input
                  value={ui.quantity}
                  onChange={(e) => patchUi({ quantity: e.target.value })}
                  placeholder="수량"
                  className="w-24 rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                />
                <input
                  type="date"
                  value={ui.expiry_date}
                  onChange={(e) => patchUi({ expiry_date: e.target.value })}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                  aria-label="유통기한"
                />
                <button
                  type="submit"
                  disabled={ui.adding}
                  className="inline-flex items-center gap-1 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  {ui.adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  추가
                </button>
              </form>
            </section>
          </>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900/40">
            <p className="text-sm text-gray-600 dark:text-gray-400">냉장고 정보를 표시할 수 없습니다.</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
