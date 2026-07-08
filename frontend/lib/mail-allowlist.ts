const STORAGE_KEY = "monenon_mail_allowlist";

export function loadMailAllowlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => String(item).trim().toLowerCase())
      .filter((email) => email.includes("@"));
  } catch {
    return [];
  }
}

export function saveMailAllowlist(emails: string[]): void {
  if (typeof window === "undefined") return;
  const normalized = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@")))];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export function addMailAllowlistEmail(email: string, current: string[]): string[] {
  const next = [...current, email.trim().toLowerCase()].filter((e) => e.includes("@"));
  const unique = [...new Set(next)];
  saveMailAllowlist(unique);
  return unique;
}

export function removeMailAllowlistEmail(email: string, current: string[]): string[] {
  const target = email.trim().toLowerCase();
  const next = current.filter((e) => e !== target);
  saveMailAllowlist(next);
  return next;
}
