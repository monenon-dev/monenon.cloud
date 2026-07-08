export function getChatUserId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("user_id");
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}
