"use client";

import { AgentMessageContent } from "@/components/chat/agent-message-content";
import { MARKDOWN_REGRESSION_FIXTURE } from "@/components/chat/markdown-chip-utils";

/**
 * Visual regression page for agent markdown chips / lists.
 * Local check: /demo/markdown-fixture
 */
export default function MarkdownFixturePage() {
  return (
    <main className="min-h-dvh bg-[#0a0a0f] px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-[#12121a] p-5 shadow-xl">
        <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-300/70">
          markdown regression fixture
        </p>
        <AgentMessageContent text={MARKDOWN_REGRESSION_FIXTURE} />
      </div>
    </main>
  );
}
