import { getApiBaseUrl } from "./api-base";

/** Silicon Valley API — `/api/v1/{slug}/myself` */
export function getSiliconValleyApiBaseUrl(): string {
  return `${getApiBaseUrl()}/api/v1`;
}

export async function fetchPersonaMyself(slug: string): Promise<string> {
  const res = await fetch(`${getSiliconValleyApiBaseUrl()}/${slug}/myself`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`${slug}/myself 요청 실패 (${res.status})`);
  }
  return res.text();
}
