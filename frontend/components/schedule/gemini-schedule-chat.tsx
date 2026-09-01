"use client";

import { useRef, useState } from "react";
import { CalendarPlus, Loader2, Send, Sparkles } from "lucide-react";

import {
  composeScheduleWithGemini,
  registerScheduleEvent,
} from "@/lib/schedule-api";
import type { CalendarEventDraft } from "@/lib/schedule-types";

type ChatItem =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; draft: CalendarEventDraft };

function formatEventTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
}

export function GeminiScheduleChat() {
  const listRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatItem[]>([
    {
      id: "welcome",
      role: "assistant",
      draft: {
        title: "",
        start: "",
        end: "",
        description: "",
        location: "",
      },
    },
  ]);
  const [ui, setUi] = useState({
    composing: false,
    registeringId: null as string | null,
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
      const draft = await composeScheduleWithGemini(prompt);
      const assistantId = crypto.randomUUID();
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", draft }]);
      scrollToBottom();
    } catch (err) {
      patchUi({
        error: err instanceof Error ? err.message : "일정 초안 작성에 실패했습니다.",
      });
    } finally {
      patchUi({ composing: false });
    }
  };

  const handleRegister = async (messageId: string, draft: CalendarEventDraft) => {
    patchUi({ registeringId: messageId, error: null, success: null });
    try {
      let result = await registerScheduleEvent(draft);
      if (result.needs_confirm) {
        const ok = window.confirm(
          result.message ||
            "톡캘린더에 겹치는 일정이 있습니다. 그래도 등록할까요?"
        );
        if (!ok) {
          patchUi({ error: "겹치는 일정으로 등록을 취소했습니다." });
          return;
        }
        result = await registerScheduleEvent(draft, { confirmOverlap: true });
      }
      patchUi({ success: result.message ?? "일정 등록 요청이 완료되었습니다." });
    } catch (err) {
      patchUi({
        error: err instanceof Error ? err.message : "일정 등록에 실패했습니다.",
      });
    } finally {
      patchUi({ registeringId: null });
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
          const registering = ui.registeringId === item.id;

          if (isWelcome) {
            return (
              <div key={item.id} className="flex justify-start">
                <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 p-3 space-y-2">
                  <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <Sparkles className="size-3.5" />
                    Gemini 안내
                  </p>
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    일정을 자연어로 입력하면 Gemini가 Google Calendar용 일정으로 정리합니다.
                    {"\n"}예: 내일 오후 3시 팀 회의 1시간, 강남역 2번 출구
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div key={item.id} className="flex justify-start">
              <div className="max-w-[92%] w-full rounded-2xl rounded-bl-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/60 p-3 space-y-2">
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Sparkles className="size-3.5" />
                  Gemini 일정 초안
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.draft.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatEventTime(item.draft.start)} ~ {formatEventTime(item.draft.end)}
                </p>
                {item.draft.location && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    장소: <span className="text-gray-800 dark:text-gray-200">{item.draft.location}</span>
                  </p>
                )}
                {item.draft.description && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {item.draft.description}
                  </p>
                )}
                <button
                  type="button"
                  disabled={registering}
                  onClick={() => void handleRegister(item.id, item.draft)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {registering ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CalendarPlus className="size-3.5" />
                  )}
                  n8n으로 등록
                </button>
              </div>
            </div>
          );
        })}
        {ui.composing && (
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 px-1">
            <Loader2 className="size-4 animate-spin" />
            Gemini가 일정을 정리 중입니다…
          </div>
        )}
      </div>

      <form onSubmit={handleCompose} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="예: 다음 주 월요일 10시 프로젝트 킥오프 미팅"
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
