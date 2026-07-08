import type { FashionPrefs } from "@/lib/user-settings";
import type { WeatherData } from "@/components/weather/weather-widget";

import { getApiBaseUrl } from "@/lib/api-base";

const defaultBase = getApiBaseUrl();

function base(apiBaseUrl?: string) {
  return (apiBaseUrl ?? defaultBase).replace(/\/$/, "");
}

export interface ClosetItem {
  id: number;
  user_id: number;
  name: string;
  category: string;
  warmth: string;
  color?: string | null;
  note?: string | null;
  match_reason?: string | null;
}

export interface ClosetOverview {
  weather: WeatherData;
  prefs: FashionPrefs;
  recommended_items: ClosetItem[];
  other_items: ClosetItem[];
  suggested_outfit: { name: string; category: string; reason: string }[];
  summary: string;
}

export async function fetchClosetOverview(
  userId: number,
  apiBaseUrl?: string
): Promise<ClosetOverview> {
  const res = await fetch(`${base(apiBaseUrl)}/platform/closet/overview?user_id=${userId}`);
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(parseDetail(data, "옷장 정보를 불러오지 못했습니다."));
  }
  return data as ClosetOverview;
}

export async function createClosetItem(
  body: {
    user_id: number;
    name: string;
    category: string;
    warmth: string;
    color?: string;
    note?: string;
  },
  apiBaseUrl?: string
): Promise<ClosetItem> {
  const res = await fetch(`${base(apiBaseUrl)}/platform/closet/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(parseDetail(data, "옷 등록 실패"));
  return data as ClosetItem;
}

export async function deleteClosetItem(
  itemId: number,
  userId: number,
  apiBaseUrl?: string
): Promise<void> {
  const res = await fetch(
    `${base(apiBaseUrl)}/platform/closet/items/${itemId}?user_id=${userId}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    const data: unknown = await res.json().catch(() => ({}));
    throw new Error(parseDetail(data, "삭제 실패"));
  }
}

function parseDetail(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null && "detail" in data) {
    return String((data as { detail: unknown }).detail);
  }
  return fallback;
}

export const CLOSET_CATEGORY_LABELS: Record<string, string> = {
  top: "상의",
  bottom: "하의",
  outer: "아우터",
  acc: "액세서리",
  shoes: "신발",
};

export const WARMTH_LABELS: Record<string, string> = {
  light: "얇음",
  mid: "보통",
  heavy: "두꺼움",
};
