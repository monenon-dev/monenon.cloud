import { getApiBaseUrl } from "@/lib/api-base";

const api = getApiBaseUrl();

export type Contact = {
  name: string;
  email: string;
};

export async function searchContacts(
  query: string,
  googleToken: string
): Promise<Contact[]> {
  if (!query.trim() || !googleToken) return [];
  const params = new URLSearchParams({ q: query.trim(), token: googleToken });
  const res = await fetch(`${api}/contacts/search?${params}`);
  if (!res.ok) return [];
  return res.json();
}
