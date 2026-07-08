export function formatApiError(data: Record<string, unknown>, fallback: string): string {
  const detail = data.detail;
  const message = data.message;
  if (typeof detail === "string") return detail;
  if (typeof message === "string") return message;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === "object" && item !== null && "msg" in item) {
          return String((item as { msg: unknown }).msg);
        }
        return typeof item === "string" ? item : null;
      })
      .filter(Boolean);
    if (parts.length) return parts.join(" ");
  }
  return fallback;
}
