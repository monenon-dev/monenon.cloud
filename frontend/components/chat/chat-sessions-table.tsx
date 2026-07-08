"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import {
  fetchAllChatSessions,
  formatSessionDate,
  type ChatSessionItem,
} from "@/lib/chat-sessions";

interface ChatSessionsTableProps {
  apiBaseUrl: string;
}

export function ChatSessionsTable({ apiBaseUrl }: ChatSessionsTableProps) {
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSessions(await fetchAllChatSessions(apiBaseUrl));
    } catch (e) {
      setError(e instanceof Error ? e.message : "불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">User & Session</p>
          <h1 className="text-2xl sm:text-3xl font-bold">채팅방</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            chat_sessions 테이블 — 사용자별 채팅 세션과 메시지 수입니다.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-900"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          새로고침
        </button>
      </div>

      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">ID</th>
                <th className="px-4 py-3 font-medium">사용자</th>
                <th className="px-4 py-3 font-medium">제목</th>
                <th className="px-4 py-3 font-medium">메시지</th>
                <th className="px-4 py-3 font-medium">생성</th>
                <th className="px-4 py-3 font-medium">수정</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading && sessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    불러오는 중…
                  </td>
                </tr>
              )}
              {!loading && sessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    등록된 채팅방이 없습니다. 홈에서 대화를 시작하거나 샘플 데이터를 넣어 보세요.
                  </td>
                </tr>
              )}
              {sessions.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-900/80">
                  <td className="px-4 py-3 font-mono text-indigo-600 dark:text-indigo-400">{s.id}</td>
                  <td className="px-4 py-3 font-mono">{s.user_id}</td>
                  <td className="px-4 py-3 font-medium max-w-xs truncate">{s.title}</td>
                  <td className="px-4 py-3">{s.message_count}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {formatSessionDate(s.created_at)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {formatSessionDate(s.updated_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
