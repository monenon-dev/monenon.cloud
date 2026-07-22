"use client";

import { useState, useRef, useEffect, useCallback, ChangeEvent, KeyboardEvent, FormEvent } from "react";
import {
  ChevronDown,
  Loader2,
  Lock,
  Mic,
  Plus,
  Send,
  SlidersHorizontal,
} from "lucide-react";

import Logo from "@/components/brand/Logo";
import {
  AgentMessageContent,
  AgentStreamingPlaceholder,
} from "@/components/chat/agent-message-content";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getTitanicApiBaseUrl } from "@/lib/api-base";
import { formatMessageTime } from "@/lib/chat-sessions";
import { type PdfBlobUploadResult, uploadPdfToBlob } from "@/lib/pdf-blob-api";

export interface GeminiChatMessage {
  role: "user" | "assistant";
  text: string;
  ts: string;
  model?: string;
  confidence?: number;
  sources?: string[];
}

interface ChatApiResponse {
  model: string;
  reply: string;
}

interface AgentChatResponse {
  answer: string;
  confidence: number;
  sources: string[];
}

export interface GeminiChatPanelProps {
  /** 기본값: `{API_BASE}/api` (Titanic 라우터) */
  apiBaseUrl?: string;
  /** POST 경로 — 기본 `/titanic/smith/chat` (`{ message }` → `{ reply }`) */
  chatPath?: string;
  placeholder?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  className?: string;
  /** 외부에서 대화 기록을 주입할 때 (채팅방 선택 등) */
  initialMessages?: GeminiChatMessage[];
  /** 지정 시 기본 fetch 대신 이 핸들러로 전송·응답 처리 */
  onSendMessage?: (text: string) => Promise<GeminiChatMessage>;
  /** initialMessages / session 변경 시 패널 리셋용 */
  resetKey?: string | number;
  /** 입력창에 미리 채울 문구 (추천 태그 등) */
  initialInput?: string;
  /** true면 initialInput을 입력창에만 넣지 않고 즉시 전송 */
  autoSendInitialInput?: boolean;
  /** autoSendInitialInput 전송 시작 후 호출 (부모 state 정리용) */
  onInitialInputHandled?: () => void;
  /** 자동 전송 중복 방지용 (resetKey와 분리) */
  starterDedupeKey?: string;
  /** 부모가 DB에서 메시지 로드 완료 시 증가 — resetKey와 별도로 initialMessages 반영 */
  messagesEpoch?: number;
  /** 게스트 모드: PDF·도구·음성 등 Moneo 전용 입력 숨김 */
  guestMode?: boolean;
  /** 빈 화면 예시 프롬프트 (클릭 시 입력창만 채움, 전송 안 함) */
  emptySuggestions?: string[];
}

const defaultBase = getTitanicApiBaseUrl();

/** React Strict Mode remount 시 starter 자동 전송 중복 방지 */
const sentStarterKeys = new Set<string>();

function isAgentChatPath(path: string) {
  return path.replace(/\/$/, "").endsWith("/agent/chat");
}

function isSmithChatPath(path: string) {
  return path.replace(/\/$/, "").endsWith("/smith/chat");
}

function buildRequestBody(
  path: string,
  text: string,
  conversation: GeminiChatMessage[] = []
): string {
  if (isAgentChatPath(path)) {
    return JSON.stringify({ prompt: text });
  }
  if (isSmithChatPath(path)) {
    return JSON.stringify({
      messages: [
        ...conversation.map((msg) => ({ role: msg.role, text: msg.text })),
        { role: "user", text },
      ],
    });
  }
  return JSON.stringify({ message: text });
}

function parseAssistantReply(
  path: string,
  raw: unknown
): Pick<GeminiChatMessage, "text" | "confidence" | "sources"> & { model?: string } {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("응답 형식이 올바르지 않습니다.");
  }
  if (isAgentChatPath(path)) {
    const data = raw as AgentChatResponse;
    if (typeof data.answer !== "string") {
      throw new Error("응답에 answer가 없습니다.");
    }
    return {
      text: data.answer,
      confidence: data.confidence,
      sources: data.sources,
    };
  }
  const data = raw as ChatApiResponse;
  if (typeof data.reply !== "string") {
    throw new Error("응답에 reply가 없습니다.");
  }
  return {
    text: data.reply,
    model: typeof data.model === "string" ? data.model : undefined,
  };
}

export function GeminiChatPanel({
  apiBaseUrl = defaultBase,
  chatPath = "/titanic/smith/chat",
  placeholder = "업무에 대해 물어보세요 (예: 이번 주 리포트 요약해 줘)",
  emptyTitle = "Moneo와 대화를 시작하세요",
  emptySubtitle = "일정·문서·리포트 등 업무를 물어보면 에이전트가 답합니다.",
  className = "",
  initialMessages,
  onSendMessage,
  resetKey,
  initialInput,
  autoSendInitialInput = false,
  onInitialInputHandled,
  starterDedupeKey,
  messagesEpoch = 0,
  guestMode = false,
  emptySuggestions,
}: GeminiChatPanelProps) {
  const [messages, setMessages] = useState<GeminiChatMessage[]>(initialMessages ?? []);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [attachment, setAttachment] = useState<PdfBlobUploadResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sentInitialRef = useRef<{ resetKey: string | number | undefined; prompt: string } | null>(null);

  const scrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const prevResetKeyRef = useRef(resetKey);

  useEffect(() => {
    if (prevResetKeyRef.current === resetKey) return;
    prevResetKeyRef.current = resetKey;
    setMessages(initialMessages ?? []);
    setErrorMessage(null);
    setInput("");
    setAttachment(null);
    sentInitialRef.current = null;
  }, [resetKey, initialMessages]);

  const prevMessagesEpochRef = useRef(messagesEpoch);

  useEffect(() => {
    if (prevMessagesEpochRef.current === messagesEpoch) return;
    prevMessagesEpochRef.current = messagesEpoch;
    if (prevResetKeyRef.current !== resetKey) return;
    setMessages(initialMessages ?? []);
  }, [messagesEpoch, initialMessages, resetKey]);

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsUploading(true);
    setErrorMessage(null);
    try {
      const result = await uploadPdfToBlob(file);
      setAttachment(result);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "PDF 첨부에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  const sendQuestion = useCallback(async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed) return;

    const userMessage: GeminiChatMessage = {
      role: "user",
      text: trimmed,
      ts: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setErrorMessage(null);

    try {
      let assistantMessage: GeminiChatMessage;

      if (onSendMessage) {
        assistantMessage = await onSendMessage(trimmed);
      } else {
        const res = await fetch(`${apiBaseUrl.replace(/\/$/, "")}${chatPath}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: buildRequestBody(chatPath, trimmed, messages),
        });

        const raw: unknown = await res.json().catch(() => ({}));
        if (!res.ok) {
          const detail =
            typeof raw === "object" && raw !== null && "detail" in raw && typeof (raw as { detail: unknown }).detail === "string"
              ? (raw as { detail: string }).detail
              : `요청 실패 (${res.status})`;
          throw new Error(detail);
        }

        const parsed = parseAssistantReply(chatPath, raw);

        assistantMessage = {
          role: "assistant",
          text: parsed.text,
          ts: new Date().toISOString(),
          model: parsed.model,
          confidence: parsed.confidence,
          sources: parsed.sources,
        };
      }

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "응답에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [apiBaseUrl, chatPath, messages, onSendMessage]);

  useEffect(() => {
    const trimmed = initialInput?.trim();
    if (!trimmed) return;

    if (!autoSendInitialInput) {
      setInput(trimmed);
      return;
    }

    const dedupeKey = `${starterDedupeKey ?? resetKey ?? "default"}::${trimmed}`;
    if (sentStarterKeys.has(dedupeKey)) return;

    sentStarterKeys.add(dedupeKey);
    sentInitialRef.current = { resetKey: resetKey ?? "default", prompt: trimmed };
    void (async () => {
      try {
        await sendQuestion(trimmed);
      } finally {
        onInitialInputHandled?.();
      }
    })();
  }, [initialInput, autoSendInitialInput, resetKey, starterDedupeKey, onInitialInputHandled, sendQuestion]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    sendQuestion(input);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendQuestion(input);
    }
  };

  const confidencePct =
    (c: number | undefined) =>
      `${(typeof c === "number" && c <= 1 ? c * 100 : Number(c ?? 0)).toFixed(1)}%`;

  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden gap-3 ${className}`}>
      <div
        ref={messagesContainerRef}
        className={`flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-4 rounded-2xl border px-4 sm:px-6 py-4 ${
          guestMode
            ? "border-white/10 bg-white/[0.02]"
            : "border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30"
        }`}
      >
          {messages.length === 0 && !isLoading && !errorMessage && (
            <div className="flex flex-col items-center justify-center gap-4 px-2 py-10 text-center">
              {guestMode ? (
                <Logo variant="symbol" theme="dark" size={40} className="opacity-90" />
              ) : null}
              <div className="space-y-1.5">
                {emptyTitle ? (
                  <p
                    className={`text-sm font-medium ${
                      guestMode ? "text-indigo-100/90" : "text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {emptyTitle}
                  </p>
                ) : null}
                <p
                  className={`text-sm leading-relaxed ${
                    guestMode ? "text-indigo-200/55" : "text-gray-400"
                  }`}
                >
                  {emptySubtitle || "메시지를 입력해 대화를 시작하세요."}
                </p>
              </div>
              {emptySuggestions && emptySuggestions.length > 0 ? (
                <div className="mt-1 flex max-w-md flex-wrap justify-center gap-2">
                  {emptySuggestions.map((hint) => (
                    <button
                      key={hint}
                      type="button"
                      onClick={() => setInput(hint)}
                      className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1.5 text-left text-xs text-indigo-100/85 transition-colors hover:border-indigo-400/50 hover:bg-indigo-500/20"
                    >
                      {hint}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          )}
          {messages.map((msg, idx) => {
            const isUser = msg.role === "user";
            const timeLabel = mounted && msg.ts ? formatMessageTime(msg.ts) : null;
            const isLastAssistant =
              msg.role === "assistant" &&
              messages.slice(idx + 1).every((m) => m.role !== "assistant");

            const regenerate = () => {
              for (let i = idx - 1; i >= 0; i -= 1) {
                if (messages[i]?.role === "user") {
                  void sendQuestion(messages[i]!.text);
                  return;
                }
              }
            };

            return (
            <div
              key={`${msg.role}-${msg.ts}-${idx}`}
              className={`flex items-end gap-1.5 ${isUser ? "justify-end" : "justify-start"}`}
            >
              {isUser && timeLabel && (
                <span className="shrink-0 pb-1 text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
                  {timeLabel}
                </span>
              )}
              <div
                className={`max-w-[min(100%,42rem)] sm:max-w-[85%] rounded-2xl px-4 py-3 ${
                  isUser
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                }`}
              >
                {isUser ? (
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                ) : (
                  <AgentMessageContent
                    text={msg.text}
                    onRegenerate={isLastAssistant ? regenerate : undefined}
                  />
                )}
                {msg.role === "assistant" &&
                  (msg.model ||
                    (msg.confidence !== undefined && msg.confidence > 0) ||
                    (msg.sources && msg.sources.length > 0)) && (
                  <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 text-[11px] opacity-70">
                    {msg.model && <span>모델: {msg.model}</span>}
                    {msg.confidence !== undefined && msg.confidence > 0 && (
                      <span className={msg.model ? "ml-3" : ""}>신뢰도: {confidencePct(msg.confidence)}</span>
                    )}
                    {msg.sources && msg.sources.length > 0 && (
                      <span className="ml-3">출처: {msg.sources.join(", ")}</span>
                    )}
                  </div>
                )}
              </div>
              {!isUser && timeLabel && (
                <span className="shrink-0 pb-1 text-[11px] tabular-nums text-gray-400 dark:text-gray-500">
                  {timeLabel}
                </span>
              )}
            </div>
            );
          })}
          {isLoading && (
            <div className="flex justify-start">
              <AgentStreamingPlaceholder />
            </div>
          )}
          {errorMessage && (
            <p className="text-center text-sm text-red-600 dark:text-red-400 px-2" role="alert">
              {errorMessage}
            </p>
          )}
      </div>

      <form onSubmit={handleSubmit} className="w-full shrink-0 pr-1">
        {!guestMode ? (
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            void handleFileChange(e);
          }}
        />
        ) : null}
        <div
          className={`rounded-[1.75rem] border overflow-hidden ${
            guestMode
              ? "border-white/10 bg-white/[0.04] shadow-none"
              : "border-gray-200/95 bg-[#f4f6f8] shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-gray-700 dark:bg-gray-900/95 dark:shadow-none"
          }`}
        >
          {!guestMode && attachment && (
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-200/90 px-4 py-2 text-xs dark:border-gray-700/90">
              <a
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex max-w-full items-center gap-1 rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:text-indigo-200"
              >
                PDF: {attachment.filename}
              </a>
              <a
                href={attachment.contentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                본문 텍스트
              </a>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                제거
              </button>
            </div>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full min-h-[5.5rem] resize-none border-0 bg-transparent px-4 sm:px-5 pt-4 pb-2 text-[15px] leading-relaxed focus:outline-none focus:ring-0 ${
              guestMode
                ? "text-indigo-50 placeholder:text-indigo-200/40"
                : "text-gray-900 placeholder:text-gray-500/80 dark:text-gray-100 dark:placeholder:text-gray-500"
            }`}
            rows={3}
            aria-label="메시지 입력"
          />
          <div
            className={`flex items-center justify-between gap-2 px-2 py-2 sm:px-3 ${
              guestMode
                ? "border-t border-white/10"
                : "border-t border-gray-200/90 dark:border-gray-700/90"
            }`}
          >
            {!guestMode ? (
            <div className="flex items-center gap-0.5 text-gray-600 dark:text-gray-400">
              <button
                type="button"
                onClick={handleAttachClick}
                disabled={isUploading}
                className="rounded-full p-2.5 hover:bg-gray-200/70 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                aria-label="PDF 첨부"
                title="PDF 첨부 (Blob 저장)"
              >
                {isUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.75} />
                ) : (
                  <Plus className="h-5 w-5" strokeWidth={1.75} />
                )}
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full py-2 pl-2 pr-3 hover:bg-gray-200/70 dark:hover:bg-gray-800 transition-colors text-sm"
                aria-label="도구"
                title="도구 (준비 중)"
              >
                <SlidersHorizontal className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                <span className="hidden sm:inline">도구</span>
              </button>
            </div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="inline-flex items-center gap-1.5 px-2 text-xs text-indigo-200/55">
                    <Lock className="size-3 opacity-80" aria-hidden />
                    기본 채팅
                  </p>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  className="border border-white/10 bg-[#12121c] text-indigo-100"
                >
                  로그인하면 모델을 선택할 수 있어요
                </TooltipContent>
              </Tooltip>
            )}
            <div className="flex items-center gap-1 sm:gap-2 text-gray-600 dark:text-gray-400 ml-auto">
              {!guestMode ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-full py-2 pl-3 pr-2 text-sm hover:bg-gray-200/70 dark:hover:bg-gray-800 transition-colors"
                aria-haspopup="listbox"
                aria-expanded="false"
                title="모델 선택 (준비 중)"
              >
                <span className="max-w-[5.5rem] truncate sm:max-w-none">빠른 모델</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
              </button>
              ) : null}
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:pointer-events-none disabled:opacity-40"
                aria-label="전송"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 translate-x-px translate-y-px" strokeWidth={2} />
                )}
              </button>
              {!guestMode ? (
              <button
                type="button"
                className="rounded-full p-2.5 hover:bg-gray-200/70 dark:hover:bg-gray-800 transition-colors"
                aria-label="음성 입력"
                title="음성 입력 (준비 중)"
              >
                <Mic className="h-5 w-5" strokeWidth={1.75} />
              </button>
              ) : null}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
