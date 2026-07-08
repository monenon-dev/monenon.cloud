const LOCAL_API_BASE = "http://127.0.0.1:8000";

/** .env.example placeholder — 빌드에 박히면 API 전체가 깨짐 */
function isPlaceholderApiUrl(url: string): boolean {
  return /your-api\.example\.com/i.test(url) || url.includes("example.com");
}

/**
 * API 베이스 URL — Vercel/Docker 빌드 시 NEXT_PUBLIC_API_BASE_URL 필요.
 * 미설정·placeholder면 로컬 백엔드(8000)로 폴백.
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (fromEnv && !isPlaceholderApiUrl(fromEnv)) {
    return fromEnv.replace(/\/$/, "");
  }
  if (fromEnv && isPlaceholderApiUrl(fromEnv)) {
    console.warn(
      "[api] NEXT_PUBLIC_API_BASE_URL이 예시 값입니다. backend/.env 또는 Docker 빌드 args를 확인하세요."
    );
  } else if (process.env.NODE_ENV === "production") {
    console.warn(
      "[api] NEXT_PUBLIC_API_BASE_URL이 없습니다. Docker 빌드 args 또는 Vercel 환경 변수를 설정하세요."
    );
  }
  return LOCAL_API_BASE;
}

/** Titanic API — `/api/titanic/{crew}/myself` 형식 */
export function getTitanicApiBaseUrl(): string {
  return `${getApiBaseUrl()}/api`;
}
