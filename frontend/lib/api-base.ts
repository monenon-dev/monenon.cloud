const LOCAL_API_BASE = "http://127.0.0.1:8000";
const PRODUCTION_API_BASE = "https://moneo-api.choseohee.com";

/** .env.example placeholder — 빌드에 박히면 API 전체가 깨짐 */
function isPlaceholderApiUrl(url: string): boolean {
  return /your-api\.example\.com/i.test(url) || url.includes("example.com");
}

function isLocalhostUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

function isMonenonHost(hostname: string): boolean {
  return hostname === "moneo.choseohee.com";
}

function fromEnv(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!raw || isPlaceholderApiUrl(raw)) return "";
  return raw.replace(/\/$/, "");
}

function ensureHttpsOnSecurePage(url: string): string {
  if (typeof window === "undefined") return url;
  if (window.location.protocol !== "https:") return url;
  if (isLocalhostUrl(url)) return url;
  if (url.startsWith("http://")) return `https://${url.slice("http://".length)}`;
  return url;
}

/**
 * API 베이스 URL — Vercel/Docker 빌드 시 NEXT_PUBLIC_API_BASE_URL 필요.
 * moneo.choseohee.com 에서는 로컬/placeholder 값이 박혀 있어도 moneo-api.choseohee.com 로 붙인다.
 */
export function getApiBaseUrl(): string {
  const envUrl = fromEnv();

  if (typeof window !== "undefined" && isMonenonHost(window.location.hostname)) {
    if (!envUrl || isLocalhostUrl(envUrl) || isPlaceholderApiUrl(envUrl)) {
      return PRODUCTION_API_BASE;
    }
    return ensureHttpsOnSecurePage(envUrl);
  }

  if (envUrl) return envUrl;

  if (typeof window === "undefined" && process.env.NODE_ENV === "production") {
    return PRODUCTION_API_BASE;
  }

  return LOCAL_API_BASE;
}

/** Titanic API — `/api/titanic/{crew}/myself` 형식 */
export function getTitanicApiBaseUrl(): string {
  return `${getApiBaseUrl()}/api`;
}
