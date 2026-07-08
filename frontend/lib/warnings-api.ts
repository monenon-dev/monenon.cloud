import { getApiBaseUrl } from "@/lib/api-base";

const apiBaseUrl = getApiBaseUrl();

export type Warning = {
  id: number;
  admin_id: number;
  user_id: number;
  message: string;
  created_at: string | null;
};

export async function fetchUserWarnings(userId: number): Promise<Warning[]> {
  try {
    const res = await fetch(`${apiBaseUrl}/auth/warnings?user_id=${userId}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as Warning[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}
