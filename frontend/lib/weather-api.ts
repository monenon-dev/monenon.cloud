import { getApiBaseUrl } from "@/lib/api-base";

export interface WeatherData {
  city: string;
  country?: string;
  temp_c?: number;
  feels_like_c?: number;
  humidity?: number;
  description?: string;
  icon?: string;
  icon_url?: string;
  wind_mps?: number;
}

export async function fetchWeather(apiBaseUrl = getApiBaseUrl()): Promise<WeatherData> {
  const base = apiBaseUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/weather`);
  const raw: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof raw === "object" &&
      raw !== null &&
      "detail" in raw &&
      typeof (raw as { detail: unknown }).detail === "string"
        ? (raw as { detail: string }).detail
        : `날씨 조회 실패 (${res.status})`;
    throw new Error(detail);
  }
  return raw as WeatherData;
}
