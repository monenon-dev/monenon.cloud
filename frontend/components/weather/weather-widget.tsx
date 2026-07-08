"use client";

import { Cloud, Droplets, Loader2, MapPin, RefreshCw, Wind } from "lucide-react";

import { getApiBaseUrl } from "@/lib/api-base";
import { useWeather } from "@/lib/use-weather";
import type { WeatherData } from "@/lib/weather-api";

export type { WeatherData };

interface WeatherWidgetProps {
  apiBaseUrl?: string;
  className?: string;
  /** compact: 헤더용 작은 칩, hero: 히어로 오른쪽 큰 시각 카드 */
  variant?: "compact" | "hero";
}

const defaultBase = getApiBaseUrl();

function heroGradient(icon?: string): string {
  const code = (icon || "01d").slice(0, 2);
  if (code.startsWith("09") || code.startsWith("10") || code.startsWith("11")) {
    return "from-slate-500/20 via-sky-600/25 to-indigo-900/30";
  }
  if (code.startsWith("13")) {
    return "from-sky-100/40 via-slate-200/30 to-indigo-100/20 dark:from-slate-600/30 dark:via-slate-500/20 dark:to-indigo-950/40";
  }
  if (code === "01" || code.startsWith("02")) {
    return "from-amber-200/50 via-sky-300/40 to-indigo-400/30 dark:from-amber-500/15 dark:via-sky-600/20 dark:to-indigo-800/30";
  }
  return "from-sky-200/50 via-indigo-200/30 to-violet-300/25 dark:from-sky-900/40 dark:via-indigo-950/50 dark:to-violet-950/30";
}

export function WeatherWidget({
  apiBaseUrl = defaultBase,
  className = "",
  variant = "compact",
}: WeatherWidgetProps) {
  const { data, loading, error, reload: load } = useWeather(apiBaseUrl);

  if (variant === "hero") {
    return (
      <WeatherHeroCard
        className={className}
        data={data}
        loading={loading}
        error={error}
        onRefresh={load}
      />
    );
  }

  if (loading && !data) {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/50 px-3 py-2 text-sm text-gray-500 ${className}`}
        aria-label="날씨 로딩 중"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>날씨 불러오는 중…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-800 dark:text-amber-200 max-w-[14rem] ${className}`}
        role="status"
      >
        <Cloud className="h-4 w-4 shrink-0" />
        <span className="line-clamp-2">{error}</span>
        <button
          type="button"
          onClick={load}
          className="shrink-0 rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900/50"
          aria-label="다시 시도"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  if (!data) return null;

  const temp =
    typeof data.temp_c === "number" ? `${Math.round(data.temp_c)}°C` : "—";

  return (
    <div
      className={`inline-flex items-center gap-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/80 px-3 py-2 shadow-sm ${className}`}
      aria-label={`${data.city} 날씨`}
    >
      {data.icon_url ? (
        <img
          src={data.icon_url}
          alt=""
          width={40}
          height={40}
          className="h-10 w-10 -my-1"
        />
      ) : (
        <Cloud className="h-8 w-8 text-sky-500" />
      )}
      <div className="min-w-0 text-left">
        <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate font-medium text-gray-700 dark:text-gray-300">
            {data.city}
            {data.country ? `, ${data.country}` : ""}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-semibold text-gray-900 dark:text-white">{temp}</span>
          {data.description && (
            <span className="text-xs text-gray-600 dark:text-gray-400 capitalize truncate max-w-[8rem]">
              {data.description}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={load}
        disabled={loading}
        className="shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
        aria-label="날씨 새로고침"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}

function WeatherHeroCard({
  className,
  data,
  loading,
  error,
  onRefresh,
}: {
  className?: string;
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const gradient = heroGradient(data?.icon);

  if (loading && !data) {
    return (
      <div
        className={`flex h-[min(220px,42vw)] w-full min-w-[240px] max-w-[320px] items-center justify-center rounded-2xl border border-gray-200/80 dark:border-gray-700/80 bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-gray-900 dark:to-indigo-950/50 ${className}`}
        aria-label="날씨 로딩 중"
      >
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`flex h-[min(220px,42vw)] w-full min-w-[240px] max-w-[320px] flex-col items-center justify-center gap-2 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 text-center dark:border-amber-900/50 dark:bg-amber-950/40 ${className}`}
        role="status"
      >
        <Cloud className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        <p className="text-xs text-amber-800 dark:text-amber-200 line-clamp-3">{error}</p>
        <button
          type="button"
          onClick={onRefresh}
          className="mt-1 inline-flex items-center gap-1 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-100"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          다시 시도
        </button>
      </div>
    );
  }

  if (!data) return null;

  const temp = typeof data.temp_c === "number" ? Math.round(data.temp_c) : null;
  const feels =
    typeof data.feels_like_c === "number" ? Math.round(data.feels_like_c) : null;

  return (
    <aside
      className={`relative w-full min-w-[240px] max-w-[320px] overflow-hidden rounded-2xl border border-white/60 shadow-lg shadow-indigo-500/10 dark:border-gray-700/80 dark:shadow-indigo-900/20 ${className}`}
      aria-label={`${data.city} 현재 날씨`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradient}`}
        aria-hidden
      />
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/30 blur-2xl dark:bg-white/10" aria-hidden />
      <div className="absolute -bottom-8 -left-4 h-28 w-28 rounded-full bg-indigo-400/20 blur-2xl" aria-hidden />

      <div className="relative flex flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
            <MapPin className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>
              {data.city}
              {data.country ? ` · ${data.country}` : ""}
            </span>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-white/50 dark:hover:bg-gray-800/60 disabled:opacity-50"
            aria-label="날씨 새로고침"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="mt-2 flex items-center justify-center gap-1 sm:gap-2">
          {data.icon_url ? (
            <img
              src={data.icon_url}
              alt={data.description || "날씨 아이콘"}
              width={96}
              height={96}
              className="h-20 w-20 sm:h-24 sm:w-24 drop-shadow-md"
            />
          ) : (
            <Cloud className="h-20 w-20 text-sky-500 sm:h-24 sm:w-24" strokeWidth={1.25} />
          )}
          <div className="text-left">
            {temp !== null && (
              <p className="text-5xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white sm:text-6xl">
                {temp}
                <span className="text-2xl font-semibold text-gray-600 dark:text-gray-300 sm:text-3xl">
                  °
                </span>
              </p>
            )}
            {feels !== null && temp !== null && feels !== temp && (
              <p className="text-xs text-gray-600 dark:text-gray-400">체감 {feels}°</p>
            )}
          </div>
        </div>

        {data.description && (
          <p className="mt-1 text-center text-sm font-medium capitalize text-gray-700 dark:text-gray-200">
            {data.description}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/40 pt-3 dark:border-gray-600/40">
          {data.humidity != null && (
            <div className="flex items-center gap-2 rounded-lg bg-white/50 px-2.5 py-2 dark:bg-gray-900/40">
              <Droplets className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-500">습도</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{data.humidity}%</p>
              </div>
            </div>
          )}
          {typeof data.wind_mps === "number" && (
            <div className="flex items-center gap-2 rounded-lg bg-white/50 px-2.5 py-2 dark:bg-gray-900/40">
              <Wind className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-500">풍속</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {data.wind_mps} m/s
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
