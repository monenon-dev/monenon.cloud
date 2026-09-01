"use client";

import { Bot } from "lucide-react";

type PreviewBubbleProps = {
  role: "user" | "agent";
  text: string;
  typing?: boolean;
};

export function PreviewBubble({ role, text, typing }: PreviewBubbleProps) {
  const isUser = role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-indigo-400/30 bg-indigo-500/15 text-indigo-300">
          <Bot size={14} />
        </div>
      )}
      <div
        className={`max-w-[92%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "border border-indigo-400/20 bg-indigo-500/25 text-indigo-50"
            : "border border-white/10 bg-white/[0.04] text-zinc-200"
        }`}
      >
        {text}
        {typing ? (
          <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-indigo-300/80 align-middle" />
        ) : null}
      </div>
    </div>
  );
}
