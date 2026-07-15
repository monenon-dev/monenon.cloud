"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import {
  ChevronDown,
  LayoutGrid,
  Loader2,
  Mic,
  Plus,
  Send,
} from "lucide-react";

import { getApiBaseUrl } from "@/lib/api-base";
import { formatMessageTime } from "@/lib/chat-sessions";

type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  ts: string;
};

type UiState = {
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  error: string | null;
  mounted: boolean;
};

const ACCENT = "#1fa97a";
const SEND = "#7dcfb6";

function SoccerBallIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9.5" stroke={ACCENT} strokeWidth="1.5" fill="#e8f8f1" />
      <path
        d="M12 7.2 14.6 9l-.8 3.1H10.2L9.4 9 12 7.2Z"
        fill={ACCENT}
        opacity="0.85"
      />
      <path
        d="M9.4 9 7.2 10.2 8 13.2h2.2M14.6 9l2.2 1.2-.8 3H14"
        stroke={ACCENT}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M8 13.2 9.5 16.2 12 15l2.5 1.2 1.5-3"
        stroke={ACCENT}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MoneyballChatPanel({ className = "" }: { className?: string }) {
  const apiBase = getApiBaseUrl().replace(/\/$/, "");
  const [ui, setUi] = useState<UiState>({
    messages: [],
    input: "",
    loading: false,
    error: null,
    mounted: false,
  });
  const listRef = useRef<HTMLDivElement>(null);

  const updateUi = (patch: Partial<UiState>) =>
    setUi((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    updateUi({ mounted: true });
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [ui.messages, ui.loading]);

  const sendQuestion = useCallback(async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;

    let blocked = false;
    setUi((prev) => {
      if (prev.loading) {
        blocked = true;
        return prev;
      }
      return {
        ...prev,
        messages: [
          ...prev.messages,
          { role: "user", text: trimmed, ts: new Date().toISOString() },
        ],
        input: "",
        loading: true,
        error: null,
      };
    });
    if (blocked) return;

    try {
      const res = await fetch(`${apiBase}/api/moneyball/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const raw = (await res.json().catch(() => ({}))) as {
        reply?: string;
        detail?: string;
      };
      if (!res.ok || typeof raw.reply !== "string") {
        throw new Error(raw.detail ?? `요청 실패 (${res.status})`);
      }
      setUi((prev) => ({
        ...prev,
        messages: [
          ...prev.messages,
          {
            role: "assistant",
            text: raw.reply as string,
            ts: new Date().toISOString(),
          },
        ],
        loading: false,
      }));
    } catch (err) {
      setUi((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "응답에 실패했습니다.",
      }));
    }
  }, [apiBase]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendQuestion(ui.input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendQuestion(ui.input);
    }
  };

  const empty = ui.messages.length === 0 && !ui.loading;

  return (
    <div
      className={`flex h-full min-h-0 flex-col bg-[#f7f7f8] text-zinc-900 ${className}`}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-5 pb-6 pt-8 sm:px-8">
        <p className="text-[11px] font-medium tracking-[0.18em] text-zinc-400">
          LESSON · RAG SYSTEM
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-[1.75rem]">
          MONEYBALL SOCCER RAG
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">
          K리그 경기장·팀·선수·일정 DB를 근거로 답하는 축구 RAG 실습 챗봇입니다.
        </p>

        <div
          ref={listRef}
          className="mt-8 min-h-0 flex-1 overflow-y-auto overscroll-contain"
        >
          {empty ? (
            <div className="flex flex-col items-start pt-6 sm:pt-10">
              <div className="flex items-center gap-2">
                <SoccerBallIcon className="size-6" />
                <span
                  className="text-[11px] font-semibold tracking-[0.2em]"
                  style={{ color: ACCENT }}
                >
                  FOOTBALL INTELLIGENCE
                </span>
              </div>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                축구 마스터 챗봇
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-500">
                선수 기록부터 경기 일정까지, 축구에 진심인 AI에게 물어보세요.
              </p>
            </div>
          ) : (
            <div className="space-y-5 pb-4">
              {ui.messages.map((msg, idx) => {
                const isUser = msg.role === "user";
                const timeLabel =
                  ui.mounted && msg.ts ? formatMessageTime(msg.ts) : null;
                return (
                  <div
                    key={`${msg.role}-${msg.ts}-${idx}`}
                    className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {isUser && timeLabel ? (
                      <span className="shrink-0 pb-1 text-[11px] tabular-nums text-zinc-400">
                        {timeLabel}
                      </span>
                    ) : null}
                    <div
                      className={`max-w-[min(100%,36rem)] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                        isUser
                          ? "bg-zinc-900 text-white"
                          : "border border-zinc-200/80 bg-white text-zinc-800 shadow-sm"
                      }`}
                    >
                      {msg.text}
                    </div>
                    {!isUser && timeLabel ? (
                      <span className="shrink-0 pb-1 text-[11px] tabular-nums text-zinc-400">
                        {timeLabel}
                      </span>
                    ) : null}
                  </div>
                );
              })}
              {ui.loading ? (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white px-4 py-3 text-sm text-zinc-500 shadow-sm">
                    <Loader2 className="size-4 animate-spin" style={{ color: ACCENT }} />
                    답변 작성 중…
                  </div>
                </div>
              ) : null}
              {ui.error ? (
                <p className="text-center text-sm text-red-600" role="alert">
                  {ui.error}
                </p>
              ) : null}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-4 shrink-0">
          <div className="overflow-hidden rounded-[1.75rem] border border-zinc-200/90 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <textarea
              value={ui.input}
              onChange={(e) => updateUi({ input: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="축구 마스터에게 물어보기"
              rows={empty ? 3 : 2}
              disabled={ui.loading}
              aria-label="축구 마스터에게 물어보기"
              className="w-full resize-none border-0 bg-transparent px-5 pt-4 pb-2 text-[15px] leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0 disabled:opacity-60"
            />
            <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1">
              <div className="flex items-center gap-0.5 text-zinc-500">
                <button
                  type="button"
                  className="rounded-full p-2.5 transition-colors hover:bg-zinc-100"
                  aria-label="첨부"
                  title="준비 중"
                >
                  <Plus className="size-5" strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 text-sm transition-colors hover:bg-zinc-100"
                  aria-label="도구"
                  title="준비 중"
                >
                  <LayoutGrid className="size-4 shrink-0" strokeWidth={1.75} />
                  <span className="hidden sm:inline">도구</span>
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-500">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm transition-colors hover:bg-zinc-100"
                  title="빠른 응답"
                >
                  <span>빠른 응답</span>
                  <ChevronDown className="size-4 opacity-70" />
                </button>
                <button
                  type="button"
                  className="rounded-full p-2.5 transition-colors hover:bg-zinc-100"
                  aria-label="음성 입력"
                  title="준비 중"
                >
                  <Mic className="size-5" strokeWidth={1.75} />
                </button>
                <button
                  type="submit"
                  disabled={ui.loading || !ui.input.trim()}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm transition-opacity disabled:pointer-events-none disabled:opacity-40"
                  style={{ backgroundColor: SEND }}
                  aria-label="전송"
                >
                  {ui.loading ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Send className="size-4 translate-x-px translate-y-px" strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>
          </div>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-zinc-400">
            축구 마스터는 기록·통계를 틀릴 수 있습니다. DB에 있는 사실만 신뢰하세요.
            {" · "}
            <LinkSeedHint />
          </p>
        </form>
      </div>
    </div>
  );
}

function LinkSeedHint() {
  return (
    <a href="/lesson/moneyball" className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-600">
      더미 데이터 시드
    </a>
  );
}
