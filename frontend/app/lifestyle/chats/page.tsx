"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import { ChatFridgeBanner } from "@/components/chat/chat-fridge-banner";
import { ChatSessionsSidebar } from "@/components/chat/chat-sessions-sidebar";
import {
  GeminiChatPanel,
  type GeminiChatMessage,
} from "@/components/chat/gemini-chat-panel";
import { promptToSessionTitle, storedMessagesToGemini } from "@/lib/chat-messages";
import {
  clearChatStarter,
  readChatStarter,
} from "@/lib/chat-starter";
import {
  createChatSession,
  deleteChatSession,
  fetchChatSessions,
  fetchSessionMessages,
  saveSessionMessage,
  updateChatSessionTitle,
  type ChatSessionItem,
} from "@/lib/chat-sessions";
import { getChatUserId } from "@/lib/chat-user";
import {
  callGuestChat,
  getGuestRemaining,
  GUEST_DAILY_LIMIT,
} from "@/lib/guest-chat";
import { loadMyPagePreferences, wrapPromptWithSpeechTone } from "@/lib/mypage-preferences";
import { routes, chatsSessionUrl } from "@/lib/routes";
import { getApiBaseUrl } from "@/lib/api-base";

const apiBaseUrl = getApiBaseUrl();

async function callAgentChat(text: string, userId: number): Promise<GeminiChatMessage> {
  const prefs = loadMyPagePreferences(userId);
  const { speechTone, userType, industry } = prefs;
  const prompt = wrapPromptWithSpeechTone(text, speechTone, { userType, industry });
  const res = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/agent/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      user_id: userId,
      speech_tone: speechTone,
      user_type: userType,
      industry,
    }),
  });
  const raw: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      typeof raw === "object" &&
      raw !== null &&
      "detail" in raw &&
      typeof (raw as { detail: unknown }).detail === "string"
        ? (raw as { detail: string }).detail
        : `요청 실패 (${res.status})`;
    throw new Error(detail);
  }
  if (typeof raw !== "object" || raw === null || typeof (raw as { answer?: unknown }).answer !== "string") {
    throw new Error("응답에 answer가 없습니다.");
  }
  const data = raw as { answer: string; confidence?: number; sources?: string[] };
  return {
    role: "assistant",
    text: data.answer,
    ts: new Date().toISOString(),
    confidence: data.confidence,
    sources: data.sources,
  };
}

function ChatsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);

  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [sessionMessages, setSessionMessages] = useState<GeminiChatMessage[]>([]);
  const [messagesEpoch, setMessagesEpoch] = useState(0);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const [starterPrompt, setStarterPrompt] = useState<string | undefined>(undefined);
  const [starterNonce, setStarterNonce] = useState<string | undefined>(undefined);
  const [guestRemaining, setGuestRemaining] = useState(GUEST_DAILY_LIMIT);

  const isNewFromHome = searchParams.get("new") === "1";
  const loadedSessionRef = useRef<number | null>(null);
  /** 카드/태그 자동 질문 중 loadMessages가 응답을 덮어쓰지 않도록 */
  const skipLoadSessionRef = useRef<number | null>(null);

  const loadSessions = useCallback(async () => {
    if (!userId) {
      setSessions([]);
      setSessionsLoading(false);
      return;
    }
    setSessionsLoading(true);
    try {
      const list = await fetchChatSessions(userId, apiBaseUrl);
      setSessions(list);
    } catch (e) {
      setPageError(e instanceof Error ? e.message : "채팅방 목록을 불러오지 못했습니다.");
    } finally {
      setSessionsLoading(false);
    }
  }, [userId]);

  const loadMessages = useCallback(
    async (sessionId: number, options?: { silent?: boolean }) => {
      if (!userId) return;
      if (!options?.silent) setMessagesLoading(true);
      setPageError(null);
      try {
        const stored = await fetchSessionMessages(sessionId, userId, apiBaseUrl);
        setSessionMessages(storedMessagesToGemini(stored));
      } catch (e) {
        setSessionMessages([]);
        setPageError(e instanceof Error ? e.message : "메시지를 불러오지 못했습니다.");
      } finally {
        if (!options?.silent) setMessagesLoading(false);
        loadedSessionRef.current = sessionId;
        setMessagesEpoch((n) => n + 1);
      }
    },
    [userId]
  );

  const selectSession = useCallback(
    (sessionId: number, replaceUrl = true) => {
      loadedSessionRef.current = null;
      setActiveSessionId(sessionId);
      setStarterPrompt(undefined);
      setStarterNonce(undefined);
      setSessionMessages([]);
      void loadMessages(sessionId);
      if (replaceUrl) {
        router.replace(chatsSessionUrl(sessionId), { scroll: false });
      }
    },
    [loadMessages, router]
  );

  const handleNewChat = useCallback(async () => {
    if (!userId) return;
    setPageError(null);
    try {
      const session = await createChatSession(userId, "새 대화", apiBaseUrl);
      setSessions((prev) => [session, ...prev.filter((s) => s.id !== session.id)]);
      selectSession(session.id);
    } catch (e) {
      setPageError(e instanceof Error ? e.message : "채팅방 생성 실패");
    }
  }, [userId, selectSession]);

  const handleRenameSession = useCallback(
    async (sessionId: number, title: string) => {
      if (!userId) return;
      try {
        const updated = await updateChatSessionTitle(sessionId, userId, title, apiBaseUrl);
        setSessions((prev) => prev.map((s) => (s.id === sessionId ? updated : s)));
        setPageError(null);
      } catch (e) {
        setPageError(e instanceof Error ? e.message : "채팅방 이름 수정 실패");
        throw e;
      }
    },
    [userId]
  );

  const handleDeleteSession = useCallback(
    async (sessionId: number) => {
      if (!userId) return;
      try {
        await deleteChatSession(sessionId, userId, apiBaseUrl);
      } catch (e) {
        setPageError(e instanceof Error ? e.message : "채팅방 삭제 실패");
        throw e;
      }
      const remaining = sessions.filter((s) => s.id !== sessionId);
      setSessions(remaining);

      if (activeSessionId !== sessionId) return;

      loadedSessionRef.current = null;
      skipLoadSessionRef.current = null;
      if (remaining.length > 0) {
        selectSession(remaining[0].id);
      } else {
        setActiveSessionId(null);
        setSessionMessages([]);
        setStarterPrompt(undefined);
        setStarterNonce(undefined);
        router.replace(routes.lifestyle.chats, { scroll: false });
      }
      setPageError(null);
    },
    [userId, sessions, activeSessionId, selectSession, router]
  );

  const creatingNewRef = useRef(false);
  const newChatHandledRef = useRef<string | null>(null);

  useEffect(() => {
    setUserId(getChatUserId());
    setGuestRemaining(getGuestRemaining());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || userId) return;
    if (!isNewFromHome) return;

    const queryPrompt = searchParams.get("prompt")?.trim();
    const stored = readChatStarter();
    const prompt = queryPrompt || stored.prompt?.trim() || "";
    if (!prompt) return;

    const nonce = searchParams.get("nonce") || stored.nonce || crypto.randomUUID();
    const handleKey = `guest::${nonce}::${prompt}`;
    if (newChatHandledRef.current === handleKey) return;

    newChatHandledRef.current = handleKey;
    clearChatStarter();
    setPageError(null);
    setStarterPrompt(prompt);
    setStarterNonce(nonce);
    router.replace(routes.lifestyle.chats, { scroll: false });
  }, [mounted, userId, isNewFromHome, searchParams, router]);

  useEffect(() => {
    if (!mounted) return;
    void loadSessions();
  }, [mounted, loadSessions]);

  useEffect(() => {
    if (!userId || !isNewFromHome) return;

    const queryPrompt = searchParams.get("prompt")?.trim();
    const stored = readChatStarter();
    const prompt = queryPrompt || stored.prompt?.trim() || "";
    if (!prompt) return;

    const nonce = searchParams.get("nonce") || stored.nonce || crypto.randomUUID();
    const handleKey = `${nonce}::${prompt}`;
    if (newChatHandledRef.current === handleKey || creatingNewRef.current) return;

    creatingNewRef.current = true;
    newChatHandledRef.current = handleKey;
    clearChatStarter();
    setPageError(null);

    void (async () => {
      try {
        const session = await createChatSession(
          userId,
          promptToSessionTitle(prompt),
          apiBaseUrl
        );
        setSessions((prev) => [session, ...prev.filter((s) => s.id !== session.id)]);
        setActiveSessionId(session.id);
        setSessionMessages([]);
        skipLoadSessionRef.current = session.id;
        loadedSessionRef.current = session.id;
        setStarterPrompt(prompt);
        setStarterNonce(nonce);
        router.replace(chatsSessionUrl(session.id), { scroll: false });
      } catch (e) {
        newChatHandledRef.current = null;
        setPageError(e instanceof Error ? e.message : "채팅방 생성 실패");
      } finally {
        creatingNewRef.current = false;
      }
    })();
  }, [userId, isNewFromHome, searchParams, router]);

  useEffect(() => {
    if (!userId || isNewFromHome) return;

    const sid = searchParams.get("session");
    if (!sid) return;

    const id = Number(sid);
    if (!Number.isFinite(id)) return;

    setActiveSessionId(id);
    if (starterPrompt) return;
    if (skipLoadSessionRef.current === id) return;

    if (loadedSessionRef.current === id) return;
    loadedSessionRef.current = id;
    setSessionMessages([]);
    void loadMessages(id);
  }, [userId, isNewFromHome, searchParams, starterPrompt, loadMessages]);

  useEffect(() => {
    if (!userId || isNewFromHome || searchParams.get("session")) return;
    if (activeSessionId || sessions.length === 0) return;
    selectSession(sessions[0].id);
  }, [userId, isNewFromHome, searchParams, activeSessionId, sessions, selectSession]);

  const handleSendMessage = useCallback(
    async (text: string): Promise<GeminiChatMessage> => {
      if (!userId || !activeSessionId) {
        throw new Error("채팅방이 선택되지 않았습니다.");
      }
      const userSavePromise = saveSessionMessage(activeSessionId, userId, "user", text, apiBaseUrl);
      const assistant = await callAgentChat(text, userId);
      void Promise.allSettled([
        userSavePromise,
        saveSessionMessage(activeSessionId, userId, "assistant", assistant.text, apiBaseUrl),
      ]).then(() => {
        void loadSessions();
      });
      return assistant;
    },
    [userId, activeSessionId, loadSessions]
  );

  const handleGuestSendMessage = useCallback(async (text: string): Promise<GeminiChatMessage> => {
    const result = await callGuestChat(text);
    setGuestRemaining(result.remaining);
    return {
      role: "assistant",
      text: result.reply,
      ts: new Date().toISOString(),
      model: result.model,
    };
  }, []);

  const activeSession = useMemo(
    () => sessions.find((s) => s.id === activeSessionId) ?? null,
    [sessions, activeSessionId]
  );

  const panelResetKey = activeSessionId ?? "none";

  if (!mounted) {
    return <ChatsFallback />;
  }

  if (!userId) {
    const loginNext = encodeURIComponent(routes.lifestyle.chats);
    return (
      <div className="flex h-dvh max-h-dvh overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md">
            <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
              >
                <ArrowLeft size={18} />
                홈
              </Link>
              <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                Agent Chat
              </h1>
              <Link
                href={`${routes.oauth.login}?next=${loginNext}`}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
              >
                로그인
              </Link>
            </div>
          </header>

          <div className="shrink-0 border-b border-amber-200/80 bg-amber-50/90 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            <p>
              <span className="font-medium">게스트 모드</span> — 기본 채팅만 이용 가능합니다. 대화는
              저장되지 않습니다.
            </p>
            <p className="mt-1 text-xs opacity-90">
              오늘 남은 횟수:{" "}
              <span className="font-semibold tabular-nums">
                {guestRemaining}/{GUEST_DAILY_LIMIT}
              </span>
              {" · "}
              <Link href={`${routes.oauth.login}?next=${loginNext}`} className="underline">
                로그인
              </Link>
              하면 맞춤 에이전트·기록 저장·도구를 사용할 수 있습니다.
            </p>
          </div>

          {pageError && (
            <p role="alert" className="shrink-0 px-4 py-2 text-sm text-red-600 dark:text-red-400">
              {pageError}
            </p>
          )}

          <main className="flex flex-1 min-h-0 flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
            <GeminiChatPanel
              apiBaseUrl={apiBaseUrl}
              className="min-h-0 flex-1"
              resetKey="guest"
              guestMode
              starterDedupeKey={starterNonce}
              initialInput={starterPrompt}
              autoSendInitialInput={Boolean(starterPrompt?.trim())}
              onSendMessage={handleGuestSendMessage}
              onInitialInputHandled={() => {
                setStarterPrompt(undefined);
                setStarterNonce(undefined);
              }}
              placeholder="간단한 질문을 입력하세요 (예: 오늘 날씨 알려줘)"
              emptyTitle="게스트 채팅"
              emptySubtitle="로그인 없이 기본 대화를 체험할 수 있습니다."
            />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh max-h-dvh overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="flex w-48 shrink-0 flex-col sm:w-64">
        <ChatSessionsSidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          loading={sessionsLoading}
          onSelectSession={(id) => selectSession(id)}
          onNewChat={() => void handleNewChat()}
          onRenameSession={handleRenameSession}
          onDeleteSession={handleDeleteSession}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
              <ArrowLeft size={18} />
              홈
            </Link>
            <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-indigo-600 dark:text-indigo-400">
              {activeSession?.title ?? "Agent Chat"}
            </h1>
            <button
              type="button"
              onClick={() => void handleNewChat()}
              className="md:hidden rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium dark:border-gray-700"
            >
              새 대화
            </button>
          </div>
        </header>

        {pageError && (
          <p role="alert" className="shrink-0 px-4 py-2 text-sm text-red-600 dark:text-red-400">
            {pageError}
          </p>
        )}

        <main className="flex flex-1 min-h-0 flex-col overflow-hidden px-4 py-4 sm:px-6 sm:py-6">
          {messagesLoading && sessionMessages.length === 0 && !starterPrompt ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-indigo-600" aria-label="메시지 로딩 중" />
            </div>
          ) : activeSessionId ? (
            <>
            <ChatFridgeBanner userId={userId} apiBaseUrl={apiBaseUrl} />
            <GeminiChatPanel
              apiBaseUrl={apiBaseUrl}
              className="min-h-0 flex-1"
              resetKey={panelResetKey}
              starterDedupeKey={starterNonce}
              initialMessages={sessionMessages}
              onSendMessage={handleSendMessage}
              initialInput={starterPrompt}
              autoSendInitialInput={Boolean(starterPrompt?.trim())}
              messagesEpoch={messagesEpoch}
              placeholder="업무에 대해 물어보세요 (예: 이번 주 리포트 요약해 줘)"
              onInitialInputHandled={() => {
                skipLoadSessionRef.current = null;
                setStarterPrompt(undefined);
                setStarterNonce(undefined);
                void loadSessions();
              }}
            />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                왼쪽에서 채팅방을 선택하거나 새 대화를 시작하세요.
              </p>
              <button
                type="button"
                onClick={() => void handleNewChat()}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                새 대화 시작
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function ChatsFallback() {
  return (
    <main className="flex h-dvh items-center justify-center bg-white dark:bg-gray-950">
      <Loader2 className="size-8 animate-spin text-indigo-600" aria-label="로딩 중" />
    </main>
  );
}

export default function ChatsPage() {
  return (
    <Suspense fallback={<ChatsFallback />}>
      <ChatsPageContent />
    </Suspense>
  );
}
