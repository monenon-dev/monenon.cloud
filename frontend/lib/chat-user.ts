import { getAuthSession } from "@/lib/auth-api";

export function getChatUserId(): number | null {
  return getAuthSession()?.user_id ?? null;
}
