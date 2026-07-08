import type { GeminiChatMessage } from "@/components/chat/gemini-chat-panel";
import type { StoredMessage } from "@/lib/chat-sessions";

export function storedMessagesToGemini(messages: StoredMessage[]): GeminiChatMessage[] {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      text: m.content,
      ts: m.created_at,
    }));
}

export function promptToSessionTitle(prompt: string, maxLen = 32) {
  const trimmed = prompt.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}…`;
}
