export const ADMIN_TOKEN_KEY = "admin_access_token";
export const ADMIN_EMAIL_KEY = "admin_email";
export const ADMIN_NICKNAME_KEY = "admin_nickname";
export const ADMIN_DISPLAY_NICKNAME = "관리자";
export const ADMIN_DISPLAY_EMAIL = "admin@gmail.com";

export function getSessionUserId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("user_id");
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

export function getSessionNickname(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("user_nickname");
}

export function getSessionUserRole(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("user_role");
}

export function saveAdminSession(accessToken: string, email: string, nickname: string): void {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, accessToken);
  sessionStorage.setItem(ADMIN_EMAIL_KEY, email);
  sessionStorage.setItem(ADMIN_NICKNAME_KEY, nickname);
}

export function clearAdminSession(): void {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  sessionStorage.removeItem(ADMIN_EMAIL_KEY);
  sessionStorage.removeItem(ADMIN_NICKNAME_KEY);
}

export function getAdminEmail(): string {
  if (typeof window === "undefined") return ADMIN_DISPLAY_EMAIL;
  return sessionStorage.getItem(ADMIN_EMAIL_KEY) || ADMIN_DISPLAY_EMAIL;
}

export function getAdminNickname(): string {
  if (typeof window === "undefined") return ADMIN_DISPLAY_NICKNAME;
  return sessionStorage.getItem(ADMIN_NICKNAME_KEY) || ADMIN_DISPLAY_NICKNAME;
}

export function isSessionAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(sessionStorage.getItem(ADMIN_TOKEN_KEY));
}

export function hasSessionAuth(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(sessionStorage.getItem("access_token"));
}
