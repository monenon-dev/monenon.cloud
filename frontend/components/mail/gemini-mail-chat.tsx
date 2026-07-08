"use client";

import { useRef, useState } from "react";
import { Loader2, Mail, Send, Sparkles } from "lucide-react";

import { composeMailWithGemini, sendMail, type ComposedMail } from "@/lib/mail-api";

type ChatItem =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; draft: ComposedMail };

export function GeminiMailChat() {
  const listRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      id: "welcome",
      role: "assistant",
      draft: {
        to: "",
        subject: "",
        message:
          "받는 사람 이메일과 보낼 내용을 한 번에 입력해 주세요.\n예: whtjgml2002@gmail.com — 내일 회의 참석이 어렵다고 정중하게 전달해 줘",
      },
    },
  ]);
  const [ui, setUi] = useState({
    composing: false,
    sendingId: null as string | null,
    error: null as string | null,
    success: null as string | null,
  });

  const patchUi = (patch: Partial<typeof ui>) => setUi((prev) => ({ ...prev, ...patch }));

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const handleCompose = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const prompt = input.trim();
    if (!prompt || ui.composing) return;

    const userId = crypto.randomUUID();
    setInput("");
    patchUi({ composing: true, error: null, success: null });
    setMessages((prev) => [...prev, { id: userId, role: "user", text: prompt }]);
    scrollToBottom();

    try {
      const draft = await composeMailWithGemini(prompt);
      const assistantId = crypto.randomUUID();
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", draft }]);
      scrollToBottom();
    } catch (err) {
      patchUi({
        error: err instanceof Error ? err.message : "메일 초안 작성에 실패했습니다.",
      });
    } finally {
      patchUi({ composing: false });
    }
  };

  const handleSendDraft = async (messageId: string, draft: ComposedMail) => {
    patchUi({ sendingId: messageId, error: null, success: null });
    try {
      const result = await sendMail({
        to: draft.to,
        message: draft.message,
        subject: draft.subject,
      });
      patchUi({ success: result.message ?? "메일 전송 요청이 완료되었습니다." });
    } catch (err) {
      patchUi({
        error: err instanceof Error ? err.message : "메일 전송에 실패했습니다.",
      });
    } finally {
      patchUi({ sendingId: null });
    }
  };

  return (
    <div className="flex flex-col gap-4 min-h-[28rem]">
      {ui.success && (
        <p className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded-lg px-3 py-2">
          {ui.success}
        </p>
      )}
      {ui.error && (
        <p
          role="alert"
          className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2"
        >
          {ui.error}
        </p>
      )}

      <div
        ref={listRef}
        className="flex-1 min-h-64 max-h-96 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3 space-y-3"
      >
        {messages.map((item) => {
          if (item.role === "user") {
            return (
              <div key={item.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-2xl rounded-br-md bg-indigo-600 px-3 py-2 text-sm text-white whitespace-pre-wrap">
                  {item.text}
                </p>
              </div>
            );
          }

          const isWelcome = item.id === "welcome";
          const sending = ui.sendingId === item.id;

          return (
            <div key={item.id} className="flex justify-start">
              <div className="max-w-[92%] w-full rounded-2xl rounded-bl-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 p-3 space-y-2">
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Sparkles className="size-3.5" />
                  {isWelcome ? "Gemini 안내" : "Gemini 초안"}
                </p>
                {!isWelcome && (
                  <>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      받는 사람: <span className="text-gray-800 dark:text-gray-200">{item.draft.to}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      제목: <span className="text-gray-800 dark:text-gray-200">{item.draft.subject}</span>
                    </p>
                  </>
                )}
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{item.draft.message}</p>
                {!isWelcome && (
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => void handleSendDraft(item.id, item.draft)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Mail className="size-3.5" />}
                    n8n으로 전송
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {ui.composing && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 px-1">
            <Loader2 className="size-4 animate-spin" />
            Gemini가 메일을 작성 중입니다…
          </div>
        )}
      </div>

      <form onSubmit={handleCompose} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="예: someone@example.com — 프로젝트 일정 문의 메일 작성해 줘"
          disabled={ui.composing}
          className="flex-1 px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
        />
        <button
          type="submit"
          disabled={ui.composing || !input.trim()}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {ui.composing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          작성
        </button>
      </form>
    </div>
  );
}
