"use client";

import { Loader2, Sun, Cloud, CloudRain, Snowflake } from "lucide-react";

import {
  resolveSecretaryPersona,
  type SecretaryMood,
} from "@/lib/secretary-persona";
import { useWeather } from "@/lib/use-weather";
import { getApiBaseUrl } from "@/lib/api-base";

interface SecretaryPersonaProps {
  apiBaseUrl?: string;
  className?: string;
  nickname?: string | null;
}

function WeatherMoodIcon({ mood }: { mood: SecretaryMood }) {
  if (mood === "clear" || mood === "hot") {
    return (
      <Sun className="h-12 w-12 text-amber-500 animate-[spin_25s_linear_infinite]" aria-hidden />
    );
  }

  if (mood === "cloudy" || mood === "fog") {
    return (
      <Cloud className="h-12 w-12 animate-bounce text-sky-400" aria-hidden />
    );
  }

  if (mood === "rain" || mood === "storm") {
    return (
      <CloudRain className="h-12 w-12 animate-bounce text-blue-500" aria-hidden />
    );
  }

  if (mood === "snow" || mood === "cold") {
    return (
      <Snowflake className="h-12 w-12 animate-pulse text-sky-300" aria-hidden />
    );
  }

  return <Sun className="h-12 w-12 text-amber-500 animate-[spin_25s_linear_infinite]" aria-hidden />;
}

export function SecretaryPersona({
  apiBaseUrl = getApiBaseUrl(),
  className = "",
  nickname,
}: SecretaryPersonaProps) {
  const { data, loading, error } = useWeather(apiBaseUrl);
  const persona = resolveSecretaryPersona(data, loading, error);
  const isLoggedIn = Boolean(nickname);

  const headline = isLoggedIn
    ? `${nickname}님, ${persona.message}`
    : "안녕하세요!";

  return (
    <div
      className={`flex items-start gap-6 p-2 sm:gap-8 sm:p-3 lg:gap-10 ${className}`}
      aria-label={isLoggedIn ? `비서 인사 — ${nickname}님` : "안녕하세요!"}
    >
      <div className="relative flex h-72 w-64 flex-shrink-0 items-center justify-center overflow-visible border-none bg-transparent shadow-none animate-mascot-float sm:h-80 sm:w-72 md:h-96 md:w-80 lg:h-[400px] lg:w-[320px]">
        <img
          src="/mascot_base.png"
          alt="AI Agent"
          className="h-full w-full origin-center scale-[1.5] transform object-contain sm:scale-[1.6] lg:scale-[1.7]"
        />

        <div className="absolute right-[22%] top-[23%] z-30 drop-shadow-[0_4px_6px_rgba(0,0,0,0.2)]">
          <WeatherMoodIcon mood={persona.mood} />
        </div>
      </div>

      <div className="relative mt-8 max-w-xl rounded-3xl border border-slate-100 bg-white px-8 py-5 text-slate-800 shadow-sm sm:mt-12 sm:px-10 sm:py-6 lg:mt-16">
        <div className="absolute left-0 top-8 h-0 w-0 -translate-x-full border-b-[10px] border-b-transparent border-r-[16px] border-r-white border-t-[10px] border-t-transparent" />
        <div className="absolute left-0 top-8 -z-10 h-0 w-0 -translate-x-full border-b-[11px] border-b-transparent border-r-[17px] border-r-slate-100 border-t-[11px] border-t-transparent" />

        <p className="whitespace-nowrap text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          {persona.mood === "loading" ? (
            <span className="inline-flex items-center gap-2 text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              잠깐만요…
            </span>
          ) : (
            headline
          )}
        </p>
      </div>
    </div>
  );
}
