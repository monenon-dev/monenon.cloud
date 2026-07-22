"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Settings, Shirt, Trash2 } from "lucide-react";

import { WeatherWidget } from "@/components/weather/weather-widget";
import { getChatUserId } from "@/lib/chat-user";
import {
  CLOSET_CATEGORY_LABELS,
  WARMTH_LABELS,
  createClosetItem,
  deleteClosetItem,
  fetchClosetOverview,
  type ClosetOverview,
} from "@/lib/closet-api";

import { getApiBaseUrl } from "@/lib/api-base";
import { routes } from "@/lib/routes";

const apiBaseUrl = getApiBaseUrl();

type UiState = {
  loading: boolean;
  error: string | null;
  adding: boolean;
  name: string;
  category: string;
  warmth: string;
};

function PageFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <Loader2 className="size-8 animate-spin text-indigo-600" aria-label="불러오는 중" />
    </main>
  );
}

export default function ClosetPage() {
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [overview, setOverview] = useState<ClosetOverview | null>(null);
  const [ui, setUi] = useState<UiState>({
    loading: true,
    error: null,
    adding: false,
    name: "",
    category: "top",
    warmth: "mid",
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
      setOverview(await fetchClosetOverview(userId, apiBaseUrl));
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
      await createClosetItem(
        {
          user_id: userId,
          name: ui.name.trim(),
          category: ui.category,
          warmth: ui.warmth,
        },
        apiBaseUrl
      );
      patchUi({ name: "", adding: false });
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
      await deleteClosetItem(id, userId, apiBaseUrl);
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
          <p className="text-sm text-gray-800 dark:text-gray-200">로그인 후 옷장을 사용할 수 있습니다.</p>
          <Link href={routes.oauth.login} className="mt-4 inline-block rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white">
            로그인
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
          <Link href="/" className="text-gray-600 hover:text-gray-900 dark:text-gray-400">
            <ArrowLeft size={20} />
          </Link>
          <Shirt className="text-indigo-600" size={22} />
          <h1 className="flex-1 text-lg font-bold text-gray-900 dark:text-white">옷장</h1>
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
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {overview?.summary ?? "오늘 날씨에 맞는 옷을 정리해 드립니다."}
            </p>
          </div>
          <WeatherWidget apiBaseUrl={apiBaseUrl} variant="compact" />
        </div>

        {ui.loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-8 animate-spin text-indigo-600" />
          </div>
        ) : overview ? (
          <>
            <section className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 dark:border-indigo-900 dark:bg-indigo-950/30">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                오늘 추천 코디
              </h2>
              {overview.recommended_items.length > 0 ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {overview.recommended_items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 shadow-sm dark:bg-gray-900"
                    >
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400">
                          {item.match_reason ?? CLOSET_CATEGORY_LABELS[item.category] ?? item.category}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item.id)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                        aria-label="삭제"
                      >
                        <Trash2 size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="space-y-2">
                  {overview.suggested_outfit.map((piece, i) => (
                    <li
                      key={`${piece.name}-${i}`}
                      className="rounded-xl bg-white/80 px-3 py-2 text-sm dark:bg-gray-900/80"
                    >
                      <span className="font-medium">{piece.name}</span>
                      <span className="ml-2 text-xs text-gray-500">— {piece.reason}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-gray-500">
                옷을 등록하면 내 옷장 기준으로 추천됩니다. 선호 스타일은{" "}
                <Link href={routes.oauth.mypagePreferences} className="text-indigo-600 underline">
                  선호도 설정
                </Link>
                에서 바꿀 수 있습니다.
              </p>
            </section>

            {overview.other_items.length > 0 && (
              <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/40">
                <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">그 외 보관 중</h2>
                <ul className="flex flex-wrap gap-2">
                  {overview.other_items.map((item) => (
                    <li
                      key={item.id}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
                    >
                      {item.name}
                      <button type="button" onClick={() => void handleDelete(item.id)} aria-label="삭제">
                        <Trash2 size={14} className="text-gray-400" />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900/40">
              <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">옷 추가</h2>
              <form onSubmit={handleAdd} className="flex flex-wrap gap-2">
                <input
                  name="name"
                  value={ui.name}
                  onChange={(e) => patchUi({ name: e.target.value })}
                  placeholder="예: 네이비 코트"
                  className="min-w-[140px] flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                  required
                />
                <select
                  value={ui.category}
                  onChange={(e) => patchUi({ category: e.target.value })}
                  className="rounded-xl border border-gray-300 px-2 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                >
                  {Object.entries(CLOSET_CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  value={ui.warmth}
                  onChange={(e) => patchUi({ warmth: e.target.value })}
                  className="rounded-xl border border-gray-300 px-2 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                >
                  {Object.entries(WARMTH_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={ui.adding}
                  className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {ui.adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                  추가
                </button>
              </form>
            </section>
          </>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900/40">
            <p className="text-sm text-gray-600 dark:text-gray-400">옷장 정보를 표시할 수 없습니다.</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              다시 시도
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
