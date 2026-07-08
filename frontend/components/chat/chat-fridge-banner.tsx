"use client";

import { useEffect, useState } from "react";
import { Refrigerator } from "lucide-react";
import Link from "next/link";

import { routes } from "@/lib/routes";

import { fetchRefrigeratorItems, type RefrigeratorItem } from "@/lib/refrigerator-api";

type Props = {
  userId: number;
  apiBaseUrl: string;
};

export function ChatFridgeBanner({ userId, apiBaseUrl }: Props) {
  const [items, setItems] = useState<RefrigeratorItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchRefrigeratorItems(userId, apiBaseUrl)
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, apiBaseUrl]);

  if (loading || items.length === 0) return null;

  return (
    <div className="shrink-0 mb-3 rounded-xl border border-sky-200 bg-sky-50/80 px-3 py-2 dark:border-sky-900 dark:bg-sky-950/40">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-sky-800 dark:text-sky-300">
        <Refrigerator size={14} aria-hidden />
        <span>냉장고 재고 — AI가 이 재료를 참고해 답변합니다</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span
            key={item.id}
            className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-xs text-gray-700 ring-1 ring-sky-200 dark:bg-gray-900 dark:text-gray-200 dark:ring-sky-800"
          >
            {item.name}
            {item.quantity ? (
              <span className="ml-1 text-gray-500 dark:text-gray-400">({item.quantity})</span>
            ) : null}
          </span>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
        재고 수정은{" "}
        <Link href={routes.lifestyle.settings} className="text-indigo-600 hover:underline dark:text-indigo-400">
          취향 설정
        </Link>
        에서 할 수 있습니다.
      </p>
    </div>
  );
}
