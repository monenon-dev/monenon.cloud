import { getApiBaseUrl } from "@/lib/api-base";

const defaultBase = getApiBaseUrl();

function base(apiBaseUrl?: string) {
  return (apiBaseUrl ?? defaultBase).replace(/\/$/, "");
}

export type RefrigeratorItem = {
  id: number;
  user_id: number;
  name: string;
  quantity: string | null;
  expiry_date: string | null;
  category: string | null;
  note: string | null;
  expiry_status?: string | null;
  days_until_expiry?: number | null;
};

export type RefrigeratorOverview = {
  weather: Record<string, unknown>;
  prefs: { avoided_ingredients: string[]; cooking_preference_tags: string[] };
  items: RefrigeratorItem[];
  expiring_soon: RefrigeratorItem[];
  weather_foods: { name: string; reason: string }[];
  preferred_foods: string[];
  summary: string;
};

export function expiryBadge(status: string | null | undefined): { label: string; className: string } {
  switch (status) {
    case "expired":
      return { label: "만료", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" };
    case "urgent":
      return { label: "임박", className: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200" };
    case "soon":
      return { label: "주의", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" };
    case "ok":
      return { label: "양호", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" };
    default:
      return { label: "미입력", className: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" };
  }
}

export async function fetchRefrigeratorOverview(
  userId: number,
  apiBaseUrl?: string
): Promise<RefrigeratorOverview> {
  const res = await fetch(`${base(apiBaseUrl)}/platform/refrigerator/overview?user_id=${userId}`);
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof data === "object" && data !== null && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : "냉장고 정보를 불러오지 못했습니다.";
    throw new Error(detail);
  }
  return data as RefrigeratorOverview;
}

export async function fetchRefrigeratorItems(
  userId: number,
  apiBaseUrl?: string
): Promise<RefrigeratorItem[]> {
  const res = await fetch(`${base(apiBaseUrl)}/platform/refrigerator/items?user_id=${userId}`);
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof data === "object" && data !== null && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : "냉장고 목록을 불러오지 못했습니다.";
    throw new Error(detail);
  }
  return data as RefrigeratorItem[];
}

export async function createRefrigeratorItem(
  userId: number,
  body: { name: string; quantity?: string; expiry_date?: string },
  apiBaseUrl?: string
): Promise<RefrigeratorItem> {
  const res = await fetch(`${base(apiBaseUrl)}/platform/refrigerator/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, ...body }),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof data === "object" && data !== null && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : "식재료 추가에 실패했습니다.";
    throw new Error(detail);
  }
  return data as RefrigeratorItem;
}

export async function updateRefrigeratorItem(
  userId: number,
  itemId: number,
  body: { quantity?: string; name?: string },
  apiBaseUrl?: string
): Promise<RefrigeratorItem> {
  const res = await fetch(`${base(apiBaseUrl)}/platform/refrigerator/items/${itemId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, ...body }),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof data === "object" && data !== null && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : "수량 변경에 실패했습니다.";
    throw new Error(detail);
  }
  return data as RefrigeratorItem;
}

export async function deleteRefrigeratorItem(
  userId: number,
  itemId: number,
  apiBaseUrl?: string
): Promise<void> {
  const res = await fetch(
    `${base(apiBaseUrl)}/platform/refrigerator/items/${itemId}?user_id=${userId}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    const data: unknown = await res.json().catch(() => ({}));
    const detail =
      typeof data === "object" && data !== null && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : "식재료 삭제에 실패했습니다.";
    throw new Error(detail);
  }
}
