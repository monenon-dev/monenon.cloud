import type { WeatherData } from "@/components/weather/weather-widget";

import { getApiBaseUrl } from "@/lib/api-base";

const defaultBase = getApiBaseUrl();
const FETCH_TIMEOUT_MS = 20_000;

function base(apiBaseUrl?: string) {
  return (apiBaseUrl ?? defaultBase).replace(/\/$/, "");
}

export type MusicScene = "commute" | "outing" | "cooking";

export interface MusicPrefs {
  genre_tags: string[];
  mood_tags: string[];
}

export interface TrackRecommendation {
  title: string;
  artist: string;
  reason: string;
}

export interface SceneSection {
  key: MusicScene;
  label: string;
  emoji: string;
  hint: string;
  tracks: TrackRecommendation[];
}

export interface MusicItem {
  id: number;
  user_id: number;
  title: string;
  artist?: string | null;
  scene: MusicScene;
  note?: string | null;
}

export interface MusicOverview {
  weather: WeatherData;
  prefs: MusicPrefs;
  scenes: Record<MusicScene, SceneSection>;
  saved_by_scene: Record<MusicScene, MusicItem[]>;
  summary: string;
}

export const SCENE_ORDER: MusicScene[] = ["commute", "outing", "cooking"];

export const GENRE_QUICK_TAGS = ["K-pop", "재즈", "인디", "힙합", "클래식", "어쿠스틱"];
export const MOOD_QUICK_TAGS = ["신나는", "잔잔", "조용", "감성"];

export async function fetchMusicOverview(
  userId: number,
  apiBaseUrl?: string
): Promise<MusicOverview> {
  const res = await fetch(`${base(apiBaseUrl)}/platform/music/overview?user_id=${userId}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(parseDetail(data, "음악 추천을 불러오지 못했습니다."));
  return data as MusicOverview;
}

export async function updateMusicPrefs(
  body: { user_id: number; genre_tags?: string[]; mood_tags?: string[] },
  apiBaseUrl?: string
): Promise<MusicPrefs> {
  const res = await fetch(`${base(apiBaseUrl)}/platform/music/prefs`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(parseDetail(data, "취향 저장 실패"));
  return data as MusicPrefs;
}

export async function createMusicItem(
  body: {
    user_id: number;
    title: string;
    artist?: string;
    scene: MusicScene;
    note?: string;
  },
  apiBaseUrl?: string
): Promise<MusicItem> {
  const res = await fetch(`${base(apiBaseUrl)}/platform/music/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(parseDetail(data, "곡 등록 실패"));
  return data as MusicItem;
}

export async function deleteMusicItem(
  itemId: number,
  userId: number,
  apiBaseUrl?: string
): Promise<void> {
  const res = await fetch(`${base(apiBaseUrl)}/platform/music/items/${itemId}?user_id=${userId}`, {
    method: "DELETE",
  });
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
