"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import Logo from "@/components/brand/Logo";
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
  claimSessionIdForNonce,
  readClaimedSessionIdForNonce,
  shareNewChatByNonce,
} from "@/lib/chat-starter-lock";
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
import { loadMyPagePreferences } from "@/lib/mypage-preferences";
import { callAgentChatApi } from "@/lib/agent-chat-api";
import { routes, chatsSessionUrl } from "@/lib/routes";
import { getApiBaseUrl } from "@/lib/api-base";
import { fetchTodayBriefing } from "@/lib/briefing-api";

const apiBaseUrl = getApiBaseUrl();
const BRIEFING_INJECTED_KEY = "moneo.today_briefing_injected";

const GUEST_SUGGESTIONS = [
  "오늘 일정 정리해줘",
  "최근 대화 요약해줘",
  "이 문서 핵심만 정리해줘",
];

async function callAgentChat(
  text: string,
  userId: number,
  options?: { regenerate?: boolean }
): Promise<GeminiChatMessage> {
  const prefs = loadMyPagePreferences(userId);
  const data = await callAgentChatApi(text, userId, {
    apiBaseUrl,
    speechTone: prefs.speechTone,
    userType: prefs.userType,
    industry: prefs.industry,
    forceRefresh: Boolean(options?.regenerate),
  });
  return {
    role: "assistant",
    text: data.content,
    ts: new Date().toISOString(),
    confidence: data.confidence,
    sources: data.sources,
    responseType: data.type,
    toolLogs: data.tool_logs,
    pendingReview: data.pending_review ?? null,
    briefingId: data.briefing_id ?? null,
    userNotes: data.user_notes ?? "",
    quickReplies:
      data.type === "needs_data" && data.next_actions && data.next_actions.length > 0
        ? data.next_actions.map((a) => a.title)
        : undefined,
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

  const creatingNewRef = useRef(false);
  const newChatHandledRef = useRef<string | null>(null);

  const handleNewChat = useCallback(async () => {
    if (!userId || creatingNewRef.current) return;

    const reusable = sessions.find(
      (s) => s.message_count === 0 && s.title.trim() === "새 대화"
    );
    if (reusable) {
      selectSession(reusable.id);
      return;
    }

    creatingNewRef.current = true;
    setPageError(null);
    try {
      const session = await createChatSession(userId, "새 대화", apiBaseUrl);
      setSessions((prev) => [session, ...prev.filter((s) => s.id !== session.id)]);
      selectSession(session.id);
    } catch (e) {
      setPageError(e instanceof Error ? e.message : "채팅방 생성 실패");
    } finally {
      creatingNewRef.current = false;
    }
  }, [userId, sessions, selectSession]);

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

  /** 로그인 후 빈 세션에 오늘의 브리핑을 자동 표시 (하루 1회 주입). */
  useEffect(() => {
    if (!mounted || !userId || !activeSessionId) return;
    if (messagesLoading || starterPrompt) return;
    if (sessionMessages.length > 0) return;

    const dayKey = new Date().toISOString().slice(0, 10);
    const storageKey = `${BRIEFING_INJECTED_KEY}.${userId}.${dayKey}.${activeSessionId}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(storageKey)) {
      return;
    }

    let cancelled = false;
    const prefs = loadMyPagePreferences(userId);

    void (async () => {
      try {
        const briefing = await fetchTodayBriefing(userId, {
          apiBaseUrl,
          speechTone: prefs.speechTone,
          userType: prefs.userType,
          industry: prefs.industry,
        });
        if (cancelled) return;
        const text = briefing.content.trim();
        const assistantMsg: GeminiChatMessage = {
          role: "assistant",
          text,
          ts: new Date().toISOString(),
          responseType: "briefing",
          toolLogs: briefing.tool_logs,
          pendingReview: briefing.pending_review ?? null,
          briefingId: briefing.id ?? null,
          userNotes: briefing.user_notes ?? "",
        };
        setSessionMessages([assistantMsg]);
        setMessagesEpoch((n) => n + 1);
        sessionStorage.setItem(storageKey, "1");
        try {
          await saveSessionMessage(
            activeSessionId,
            userId,
            "assistant",
            text,
            apiBaseUrl
          );
        } catch {
          /* 표시는 유지 — 저장 실패는 무시 */
        }
      } catch {
        /* 브리핑 실패 시 빈 채팅 유지 */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    mounted,
    userId,
    activeSessionId,
    messagesLoading,
    starterPrompt,
    sessionMessages.length,
  ]);

  useEffect(() => {
    if (!userId || !isNewFromHome) return;

    const queryPrompt = searchParams.get("prompt")?.trim();
    const stored = readChatStarter();
    const prompt = queryPrompt || stored.prompt?.trim() || "";
    // nonce 없으면 UUID를 새로 뽑지 않음 — remount마다 키가 바뀌어 세션이 중복 생성됨
    const nonce = searchParams.get("nonce") || stored.nonce;
    if (!prompt || !nonce) return;

    const handleKey = `${nonce}::${prompt}`;
    if (newChatHandledRef.current === handleKey) return;
    newChatHandledRef.current = handleKey;
    clearChatStarter();
    setPageError(null);

    void (async () => {
      try {
        const claimedId = readClaimedSessionIdForNonce(nonce);
        let session: ChatSessionItem;
        if (claimedId != null) {
          const list = await fetchChatSessions(userId, apiBaseUrl);
          const found = list.find((s) => s.id === claimedId);
          if (found) {
            session = found;
            setSessions(list);
          } else {
            session = await shareNewChatByNonce(nonce, () =>
              createChatSession(userId, promptToSessionTitle(prompt), apiBaseUrl)
            );
            claimSessionIdForNonce(nonce, session.id);
            setSessions((prev) => [session, ...prev.filter((s) => s.id !== session.id)]);
          }
        } else {
          session = await shareNewChatByNonce(nonce, () =>
            createChatSession(userId, promptToSessionTitle(prompt), apiBaseUrl)
          );
          claimSessionIdForNonce(nonce, session.id);
          setSessions((prev) => [session, ...prev.filter((s) => s.id !== session.id)]);
        }

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
    async (
      text: string,
      options?: { regenerate?: boolean }
    ): Promise<GeminiChatMessage> => {
      if (!userId || !activeSessionId) {
        throw new Error("채팅방이 선택되지 않았습니다.");
      }
      const isRegenerate = Boolean(options?.regenerate);
      const userSavePromise = isRegenerate
        ? Promise.resolve()
        : saveSessionMessage(activeSessionId, userId, "user", text, apiBaseUrl);
      const assistant = await callAgentChat(text, userId, {
        regenerate: isRegenerate,
      });
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
    const used = Math.max(0, GUEST_DAILY_LIMIT - guestRemaining);
    const remainingPct = Math.round((guestRemaining / GUEST_DAILY_LIMIT) * 100);
    return (
      <div className="relative flex h-dvh max-h-dvh overflow-hidden moneo-grid-bg text-[var(--moneo-text)]">
        <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="shrink-0 border-b border-white/10 bg-[#0a0a0f]/75 backdrop-blur-md">
            <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
              <Link
                href="/"
                className="inline-flex min-w-0 items-center gap-2 text-[var(--moneo-text)] hover:opacity-90"
                aria-label="홈으로"
              >
                <Logo variant="horizontal" theme="dark" size={28} />
              </Link>
              <span className="hidden text-white/20 sm:inline" aria-hidden>
                |
              </span>
              <h1 className="min-w-0 flex-1 truncate text-sm font-medium tracking-wide text-indigo-200/80 sm:text-base">
                Agent Chat
              </h1>
              <Link
                href={`${routes.oauth.login}?next=${loginNext}`}
                className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
              >
                로그인
              </Link>
            </div>
          </header>

          <div className="shrink-0 border-b border-indigo-400/25 bg-indigo-500/10 px-4 py-3 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 border-l-2 border-indigo-400 pl-3">
                <p className="text-sm text-indigo-100/90">
                  게스트로 둘러보는 중이에요. 대화 기록은 남지 않아요.
                </p>
                <div className="mt-2 flex max-w-xs items-center gap-2">
                  <div
                    className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"
                    role="progressbar"
                    aria-valuenow={guestRemaining}
                    aria-valuemin={0}
                    aria-valuemax={GUEST_DAILY_LIMIT}
                    aria-label="오늘 남은 게스트 메시지"
                  >
                    <div
                      className="h-full rounded-full bg-indigo-400/80 transition-[width] duration-300 ease-out"
                      style={{ width: `${remainingPct}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] tabular-nums text-indigo-200/70">
                    {guestRemaining}/{GUEST_DAILY_LIMIT}
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-indigo-300/50">
                  오늘 사용 {used}회 · 남은 {guestRemaining}회
                </p>
              </div>
              <Link
                href={`${routes.oauth.login}?next=${loginNext}`}
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-indigo-400/40 bg-transparent px-3 py-2 text-xs font-medium text-indigo-100 transition-colors hover:border-indigo-400/70 hover:bg-indigo-500/15"
              >
                로그인하면 맞춤 에이전트·기록 저장·도구를 사용할 수 있습니다
              </Link>
            </div>
          </div>

          {pageError && (
            <p role="alert" className="shrink-0 px-4 py-2 text-sm text-rose-300">
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
              placeholder="업무에 대해 물어보세요 (예: 오늘 일정 정리해줘)"
              emptyTitle="업무 에이전트를 체험해 보세요"
              emptySubtitle="아래 예시로 시작하거나, 궁금한 업무를 입력해 보세요."
              emptySuggestions={GUEST_SUGGESTIONS}
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
              chatUserId={userId}
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
