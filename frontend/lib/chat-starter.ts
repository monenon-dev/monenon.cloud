import { buildChatsUrl as buildChatsUrlFromRoutes } from "@/lib/routes";

export const CHAT_STARTER_PROMPT_KEY = "chat_starter_prompt";
export const CHAT_STARTER_NONCE_KEY = "chat_starter_nonce";

export function saveChatStarter(prompt: string): string {
  const nonce = crypto.randomUUID();
  sessionStorage.setItem(CHAT_STARTER_PROMPT_KEY, prompt);
  sessionStorage.setItem(CHAT_STARTER_NONCE_KEY, nonce);
  return nonce;
}

export function readChatStarter(): { prompt: string | null; nonce: string | null } {
  if (typeof window === "undefined") {
    return { prompt: null, nonce: null };
  }
  return {
    prompt: sessionStorage.getItem(CHAT_STARTER_PROMPT_KEY),
    nonce: sessionStorage.getItem(CHAT_STARTER_NONCE_KEY),
  };
}

export function clearChatStarter() {
  sessionStorage.removeItem(CHAT_STARTER_PROMPT_KEY);
  sessionStorage.removeItem(CHAT_STARTER_NONCE_KEY);
}

export { buildChatsUrlFromRoutes as buildChatsUrl };

export { chatsSessionUrl as buildChatsSessionUrl } from "@/lib/routes";
