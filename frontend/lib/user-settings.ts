import { getApiBaseUrl } from "@/lib/api-base";

const defaultBase = getApiBaseUrl();

function base(apiBaseUrl?: string) {
  return (apiBaseUrl ?? defaultBase).replace(/\/$/, "");
}

export type GenderPreset = "mens" | "womens" | "unisex";
export type TemperatureSensitivity = "heat" | "cold" | "normal";

export interface FashionPrefs {
  gender_preset: GenderPreset;
  style_tags: string[];
  temperature_sensitivity: TemperatureSensitivity;
}

export interface FoodPrefs {
  avoided_ingredients: string[];
  cooking_preference_tags: string[];
}

export interface MusicPrefs {
  genre_tags: string[];
  mood_tags: string[];
}

export interface LifestyleProfile {
  fashion: FashionPrefs;
  food: FoodPrefs;
  music: MusicPrefs;
}

export interface UserSettingResponse {
  id: number;
  user_id: number;
  language: string;
  preferred_model: string;
  lifestyle: LifestyleProfile;
  created_at: string;
  updated_at: string;
}

export async function fetchUserSettings(
  userId: number,
  apiBaseUrl?: string
): Promise<UserSettingResponse> {
  const res = await fetch(
    `${base(apiBaseUrl)}/platform/user-settings?user_id=${userId}`
  );
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof data === "object" && data !== null && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : "설정을 불러오지 못했습니다.";
    throw new Error(detail);
  }
  return data as UserSettingResponse;
}

export async function patchUserSettings(
  userId: number,
  body: {
    language?: string;
    preferred_model?: string;
    lifestyle?: LifestyleProfile;
  },
  apiBaseUrl?: string
): Promise<UserSettingResponse> {
  const res = await fetch(`${base(apiBaseUrl)}/platform/user-settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, ...body }),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof data === "object" && data !== null && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : "설정 저장에 실패했습니다.";
    throw new Error(detail);
  }
  return data as UserSettingResponse;
}
