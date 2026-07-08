"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Minus, Plus, Refrigerator, X } from "lucide-react";

import { getApiBaseUrl } from "@/lib/api-base";
import {
  createRefrigeratorItem,
  deleteRefrigeratorItem,
  fetchRefrigeratorItems,
  updateRefrigeratorItem,
  type RefrigeratorItem,
} from "@/lib/refrigerator-api";

const STOCK_LEVELS = ["부족", "보통", "넉넉"] as const;
type StockLevel = (typeof STOCK_LEVELS)[number];
type StockDisplayMode = "count" | "level";

const apiBaseUrl = getApiBaseUrl();

function stockModeKey(userId: number) {
  return `monenon_fridge_stock_mode_${userId}`;
}

function loadStockMode(userId: number): StockDisplayMode {
  if (typeof window === "undefined") return "count";
  const raw = localStorage.getItem(stockModeKey(userId));
  return raw === "level" ? "level" : "count";
}

function saveStockMode(userId: number, mode: StockDisplayMode) {
  localStorage.setItem(stockModeKey(userId), mode);
}

function parseCount(quantity: string | null): number {
  if (!quantity) return 1;
  const match = quantity.match(/^(\d+)개$/);
  return match ? Math.max(1, parseInt(match[1], 10)) : 1;
}

function parseLevel(quantity: string | null): StockLevel {
  if (quantity && STOCK_LEVELS.includes(quantity as StockLevel)) {
    return quantity as StockLevel;
  }
  return "보통";
}

function inferDisplayMode(items: RefrigeratorItem[]): StockDisplayMode {
  if (items.some((item) => item.quantity && STOCK_LEVELS.includes(item.quantity as StockLevel))) {
    return "level";
  }
  return "count";
}

type RefrigeratorStockSectionProps = {
  userId: number;
};

export function RefrigeratorStockSection({ userId }: RefrigeratorStockSectionProps) {
  const [items, setItems] = useState<RefrigeratorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<StockDisplayMode>("count");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchRefrigeratorItems(userId, apiBaseUrl);
      setItems(rows);
      const stored = loadStockMode(userId);
      setDisplayMode(stored || inferDisplayMode(rows));
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const switchMode = (mode: StockDisplayMode) => {
    setDisplayMode(mode);
    saveStockMode(userId, mode);
  };

  const handleAdd = async () => {
    const name = draft.trim();
    if (!name) return;
    setAdding(true);
    setError(null);
    try {
      const quantity = displayMode === "level" ? "보통" : "1개";
      const created = await createRefrigeratorItem(userId, { name, quantity }, apiBaseUrl);
      setItems((prev) => [created, ...prev]);
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "추가에 실패했습니다.");
    } finally {
      setAdding(false);
    }
  };

  const handleCountChange = async (item: RefrigeratorItem, delta: number) => {
    const next = Math.max(1, parseCount(item.quantity) + delta);
    setBusyId(item.id);
    setError(null);
    try {
      const updated = await updateRefrigeratorItem(
        userId,
        item.id,
        { quantity: `${next}개` },
        apiBaseUrl
      );
      setItems((prev) => prev.map((row) => (row.id === item.id ? updated : row)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "수량 변경에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  const handleLevelChange = async (item: RefrigeratorItem, level: StockLevel) => {
    setBusyId(item.id);
    setError(null);
    try {
      const updated = await updateRefrigeratorItem(userId, item.id, { quantity: level }, apiBaseUrl);
      setItems((prev) => prev.map((row) => (row.id === item.id ? updated : row)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "잔량 변경에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (item: RefrigeratorItem) => {
    setBusyId(item.id);
    setError(null);
    try {
      await deleteRefrigeratorItem(userId, item.id, apiBaseUrl);
      setItems((prev) => prev.filter((row) => row.id !== item.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-950/30">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Refrigerator size={18} aria-hidden />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            현재 냉장고 잔량 관리
          </h3>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs dark:border-slate-600 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => switchMode("count")}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              displayMode === "count"
                ? "bg-indigo-600 text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
            }`}
          >
            개수
          </button>
          <button
            type="button"
            onClick={() => switchMode("level")}
            className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
              displayMode === "level"
                ? "bg-indigo-600 text-white"
                : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
            }`}
          >
            잔량
          </button>
        </div>
      </div>
      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        보유 식재료를 등록하면 레시피·장보기 추천에 반영됩니다.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleAdd();
            }
          }}
          placeholder="예: 감자, 우유, 양파…"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
        />
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={adding || !draft.trim()}
          className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {adding ? <Loader2 className="size-4 animate-spin" /> : "추가"}
        </button>
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      <ul className="mt-4 space-y-2" aria-label="냉장고 식재료 목록">
        {loading && (
          <li className="flex justify-center py-6">
            <Loader2 className="size-5 animate-spin text-indigo-600" aria-label="불러오는 중" />
          </li>
        )}
        {!loading && items.length === 0 && (
          <li className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-gray-500 dark:border-slate-700">
            등록된 식재료가 없습니다.
          </li>
        )}
        {!loading &&
          items.map((item) => {
            const disabled = busyId === item.id;
            const count = parseCount(item.quantity);
            const level = parseLevel(item.quantity);

            return (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate font-medium text-gray-900 dark:text-gray-100">
                    {item.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => void handleRemove(item)}
                    disabled={disabled}
                    className="shrink-0 rounded-full p-1 text-gray-400 hover:bg-slate-100 hover:text-gray-700 disabled:opacity-50 dark:hover:bg-slate-800"
                    aria-label={`${item.name} 삭제`}
                  >
                    <X size={14} />
                  </button>
                </div>

                {displayMode === "count" ? (
                  <div className="inline-flex items-center gap-1 self-end sm:self-auto">
                    <button
                      type="button"
                      disabled={disabled || count <= 1}
                      onClick={() => void handleCountChange(item, -1)}
                      className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-gray-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:hover:bg-slate-800"
                      aria-label="수량 줄이기"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="min-w-[3rem] text-center text-sm font-medium tabular-nums text-gray-900 dark:text-gray-100">
                      {count}개
                    </span>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void handleCountChange(item, 1)}
                      className="flex size-8 items-center justify-center rounded-lg border border-slate-200 text-gray-700 hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:hover:bg-slate-800"
                      aria-label="수량 늘리기"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="inline-flex self-end rounded-lg border border-slate-200 bg-slate-50 p-0.5 sm:self-auto dark:border-slate-600 dark:bg-slate-950">
                    {STOCK_LEVELS.map((stockLevel) => (
                      <button
                        key={stockLevel}
                        type="button"
                        disabled={disabled}
                        onClick={() => void handleLevelChange(item, stockLevel)}
                        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                          level === stockLevel
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "text-gray-600 hover:text-gray-900 dark:text-gray-400"
                        }`}
                      >
                        {stockLevel}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
      </ul>
    </div>
  );
}
