"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { routes } from "@/lib/routes";

import { ChatSessionSidebar } from "@/components/chat/chat-session-sidebar";
import {
  GeminiChatPanel,
  type GeminiChatMessage,
} from "@/components/chat/gemini-chat-panel";
import {
  createChatSession,
  deleteChatSessions,
  fetchChatSessions,
  fetchSessionMessages,
  saveSessionMessage,
  updateChatSessionTitle,
  type ChatSessionItem,
} from "@/lib/chat-sessions";
import { releaseStarterSend, tryAcquireStarterSend } from "@/lib/chat-starter-lock";

interface SessionChatViewProps {
  apiBaseUrl: string;
  userId: number | null;
  className?: string;
}

function toGeminiMessages(rows: { role: string; content: string; created_at: string }[]): GeminiChatMessage[] {
  return rows
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      text: m.content,
      ts: m.created_at,
    }));
}

export function SessionChatView({ apiBaseUrl, userId, className = "" }: SessionChatViewProps) {
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [history, setHistory] = useState<GeminiChatMessage[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [pendingStarter, setPendingStarter] = useState<string | null>(null);
  const sessionCreateLock = useRef<Promise<number> | null>(null);

  useEffect(() => {
    const prompt = sessionStorage.getItem("chat_starter_prompt");
    if (!prompt) return;

    const nonce = sessionStorage.getItem("chat_starter_nonce");
    if (nonce) {
      const handled = sessionStorage.getItem("chat_starter_handled_nonce");
      if (handled === nonce) {
        sessionStorage.removeItem("chat_starter_prompt");
        sessionStorage.removeItem("chat_starter_nonce");
        return;
      }
      sessionStorage.setItem("chat_starter_handled_nonce", nonce);
    }

    sessionStorage.removeItem("chat_starter_prompt");
    sessionStorage.removeItem("chat_starter_nonce");
    setPendingStarter(prompt);
  }, []);

  const loadSessions = useCallback(async () => {
    if (!userId) return;
    setLoadingSessions(true);
    try {
      const list = await fetchChatSessions(userId, apiBaseUrl);
      setSessions(list);
      setActiveId((prev) => {
        if (prev !== null && list.some((s) => s.id === prev)) return prev;
        return list.length > 0 ? list[0].id : null;
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSessions(false);
    }
  }, [userId, apiBaseUrl]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (!userId || activeId === null) {
      setHistory([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingMessages(true);
      try {
        const rows = await fetchSessionMessages(activeId, userId, apiBaseUrl);
        if (!cancelled) {
          setHistory(toGeminiMessages(rows));
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setHistory([]);
      } finally {
        if (!cancelled) setLoadingMessages(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId, userId, apiBaseUrl]);

  const handleNewChat = async () => {
    if (!userId) return;
    setCreating(true);
    try {
      const created = await createChatSession(userId, "새 대화", apiBaseUrl);
      setSessions((prev) => [created, ...prev]);
      setActiveId(created.id);
      setHistory([]);
      setEditingSessionId(created.id);
      setEditTitle("새 대화");
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleStartEdit = (sessionId: number, currentTitle: string) => {
    setEditingSessionId(sessionId);
    setEditTitle(currentTitle);
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditTitle("");
  };

  const handleDeleteSessions = async (sessionIds: number[]) => {
    if (!userId || sessionIds.length === 0) return;
    setDeleting(true);
    try {
      await deleteChatSessions(sessionIds, userId, apiBaseUrl);
      const list = await fetchChatSessions(userId, apiBaseUrl);
      setSessions(list);
      setActiveId((prev) => {
        if (prev !== null && list.some((s) => s.id === prev)) return prev;
        return list.length > 0 ? list[0].id : null;
      });
      if (activeId !== null && sessionIds.includes(activeId)) {
        setHistory([]);
      }
      if (editingSessionId !== null && sessionIds.includes(editingSessionId)) {
        handleCancelEdit();
      }
    } catch (err) {
      console.error(err);
      window.alert(err instanceof Error ? err.message : "채팅방 삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveTitle = async (sessionId: number) => {
    if (!userId) return;
    const trimmed = editTitle.trim() || "새 대화";
    const session = sessions.find((s) => s.id === sessionId);
    if (session && session.title === trimmed) {
      setEditingSessionId(null);
      setEditTitle("");
      return;
    }
    try {
      const updated = await updateChatSessionTitle(sessionId, userId, trimmed, apiBaseUrl);
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? updated : s)));
    } catch (err) {
      console.error(err);
    } finally {
      setEditingSessionId(null);
      setEditTitle("");
    }
  };

  const handleSendMessage = useCallback(
    async (
      text: string,
      options?: { forceNewSession?: boolean }
    ): Promise<GeminiChatMessage> => {
      if (!userId) {
        throw new Error("로그인이 필요합니다.");
      }

      let sessionId = options?.forceNewSession ? null : activeId;

      if (sessionId === null) {
        if (!sessionCreateLock.current) {
          sessionCreateLock.current = (async () => {
            const created = await createChatSession(
              userId,
              text.slice(0, 40) || "새 대화",
              apiBaseUrl
            );
            setActiveId(created.id);
            setSessions((prev) => [created, ...prev]);
            setEditingSessionId(created.id);
            setEditTitle(created.title);
            return created.id;
          })().finally(() => {
            sessionCreateLock.current = null;
          });
        }
        sessionId = await sessionCreateLock.current;
      }

      await saveSessionMessage(sessionId, userId, "user", text, apiBaseUrl);

      const res = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const raw: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const detail =
          typeof raw === "object" && raw !== null && "detail" in raw && typeof (raw as { detail: string }).detail === "string"
            ? (raw as { detail: string }).detail
            : `요청 실패 (${res.status})`;
        throw new Error(detail);
      }
      const reply =
        typeof raw === "object" && raw !== null && "reply" in raw && typeof (raw as { reply: string }).reply === "string"
          ? (raw as { reply: string; model?: string }).reply
          : "";
      const model =
        typeof raw === "object" && raw !== null && "model" in raw && typeof (raw as { model: string }).model === "string"
          ? (raw as { model: string }).model
          : undefined;

      await saveSessionMessage(sessionId, userId, "assistant", reply, apiBaseUrl);

      const rows = await fetchSessionMessages(sessionId, userId, apiBaseUrl);
      setHistory(toGeminiMessages(rows));

      const updated = await fetchChatSessions(userId, apiBaseUrl);
      setSessions(updated);

      return {
        role: "assistant",
        text: reply,
        ts: new Date().toISOString(),
        model,
      };
    },
    [activeId, userId, apiBaseUrl]
  );

  useEffect(() => {
    if (!pendingStarter || !userId || loadingSessions) return;
    if (!tryAcquireStarterSend(pendingStarter)) return;

    const prompt = pendingStarter;
    (async () => {
      try {
        await handleSendMessage(prompt, { forceNewSession: true });
      } catch (err) {
        console.error(err);
      } finally {
        releaseStarterSend(prompt);
        setPendingStarter(null);
      }
    })();
  }, [pendingStarter, userId, loadingSessions, handleSendMessage]);

  const initialMessages = useMemo(() => history, [history]);

  if (!userId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          채팅방을 저장하려면 로그인해 주세요.
        </p>
        <Link
          href={routes.oauth.login}
          className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          로그인
        </Link>
      </div>
    );
  }

  return (
    <div className={`flex h-full min-h-0 flex-1 flex-col gap-3 lg:flex-row lg:gap-4 ${className}`}>
      <ChatSessionSidebar
        sessions={sessions}
        activeId={activeId}
        loading={loadingSessions}
        creating={creating}
        deleting={deleting}
        onDeleteSessions={handleDeleteSessions}
        editingSessionId={editingSessionId}
        editTitle={editTitle}
        onSelect={(id) => {
          setActiveId(id);
          if (editingSessionId !== null && editingSessionId !== id) {
            handleCancelEdit();
          }
        }}
        onNewChat={handleNewChat}
        onRefresh={loadSessions}
        onEditTitleChange={setEditTitle}
        onSaveTitle={handleSaveTitle}
        onCancelEdit={handleCancelEdit}
        onStartEdit={handleStartEdit}
        className="max-h-[min(20vh,8.5rem)] sm:max-h-[min(24vh,10rem)] lg:max-h-none"
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {pendingStarter ? (
          <p className="text-sm text-gray-500 py-8 text-center">답변 생성 중…</p>
        ) : loadingMessages && activeId !== null ? (
          <p className="text-sm text-gray-500 py-8 text-center">대화 불러오는 중…</p>
        ) : (
          <GeminiChatPanel
            className="h-full min-h-0 flex-1"
            apiBaseUrl={apiBaseUrl}
            initialMessages={initialMessages}
            resetKey={activeId ?? "new"}
            onSendMessage={(text) => handleSendMessage(text)}
            placeholder="질문하세요 (예: 서울 날씨 어때?, 한국의 수도는?)"
          />
        )}
      </div>
    </div>
  );
}
