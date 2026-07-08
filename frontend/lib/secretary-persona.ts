import type { WeatherData } from "@/lib/weather-api";

export type SecretaryMood =
  | "loading"
  | "error"
  | "clear"
  | "cloudy"
  | "rain"
  | "snow"
  | "storm"
  | "fog"
  | "hot"
  | "cold";

export interface SecretaryPersonaState {
  mood: SecretaryMood;
  message: string;
  label: string;
}

function iconPrefix(icon?: string): string {
  return (icon || "01d").slice(0, 2);
}

export function resolveSecretaryPersona(
  data: WeatherData | null,
  loading: boolean,
  error: string | null
): SecretaryPersonaState {
  if (loading && !data) {
    return {
      mood: "loading",
      message: "안녕하세요!",
      label: "준비 중",
    };
  }

  if (error || !data) {
    return {
      mood: "error",
      message: "반가워요!",
      label: "대기",
    };
  }

  const code = iconPrefix(data.icon);
  const temp = typeof data.temp_c === "number" ? data.temp_c : null;
  const desc = (data.description || "").toLowerCase();

  if (code === "11" || desc.includes("thunder")) {
    return { mood: "storm", message: "천둥이 쳐요!", label: "천둥" };
  }

  if (code === "13" || desc.includes("snow")) {
    return { mood: "snow", message: "눈이 내려요!", label: "눈" };
  }

  if (code === "09" || code === "10" || desc.includes("rain") || desc.includes("drizzle")) {
    return { mood: "rain", message: "비가 와요!", label: "비" };
  }

  if (code === "50" || desc.includes("mist") || desc.includes("fog") || desc.includes("haze")) {
    return { mood: "fog", message: "안개가 껴 있어요!", label: "안개" };
  }

  if (temp !== null && temp >= 28) {
    return { mood: "hot", message: "너무 더워요!", label: "더위" };
  }

  if (temp !== null && temp <= 5) {
    return { mood: "cold", message: "추워요!", label: "추위" };
  }

  if (code === "01" || code === "02") {
    return { mood: "clear", message: "날씨가 좋아요!", label: "맑음" };
  }

  return { mood: "cloudy", message: "구름이 많아요!", label: "흐림" };
}
