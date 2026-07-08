"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchWeather, type WeatherData } from "@/lib/weather-api";
import { getApiBaseUrl } from "@/lib/api-base";

export function useWeather(apiBaseUrl = getApiBaseUrl()) {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchWeather(apiBaseUrl));
    } catch (e) {
      setData(null);
      const msg = e instanceof Error ? e.message : "날씨를 불러오지 못했습니다.";
      setError(
        msg === "Failed to fetch"
          ? "백엔드에 연결할 수 없습니다. uvicorn(8000) 실행·CORS·API 주소를 확인하세요."
          : msg
      );
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
}
