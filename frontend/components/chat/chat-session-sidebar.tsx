"use client";

import { useEffect, useRef, useState } from "react";
import { CheckSquare, Loader2, MessageSquarePlus, Pencil, RefreshCw, Square, Trash2, X } from "lucide-react";

import { formatSessionDate, type ChatSessionItem } from "@/lib/chat-sessions";

interface ChatSessionSidebarProps {
  sessions: ChatSessionItem[];
  activeId: number | null;
  loading?: boolean;
  creating?: boolean;
  deleting?: boolean;
  editingSessionId?: number | null;
  editTitle?: string;
  onSelect: (id: number) => void;
  onNewChat: () => void;
  onRefresh?: () => void;
  onDeleteSessions?: (sessionIds: number[]) => void | Promise<void>;
  onEditTitleChange?: (value: string) => void;
  onSaveTitle?: (sessionId: number) => void;
  onCancelEdit?: () => void;
  onStartEdit?: (sessionId: number, currentTitle: string) => void;
  className?: string;
}

export function ChatSessionSidebar({
  sessions,
  activeId,
  loading,
  creating,
  deleting = false,
  editingSessionId = null,
  editTitle = "",
  onSelect,
  onNewChat,
  onRefresh,
  onDeleteSessions,
  onEditTitleChange,
  onSaveTitle,
  onCancelEdit,
  onStartEdit,
  className = "",
}: ChatSessionSidebarProps) {
  const editInputRef = useRef<HTMLInputElement>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (editingSessionId !== null) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingSessionId]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set<number>();
      for (const id of prev) {
        if (sessions.some((s) => s.id === id)) next.add(id);
      }
      return next;
    });
  }, [sessions]);

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(sessions.map((s) => s.id)));
  };

  const handleDeleteSelected = async () => {
    if (!onDeleteSessions || selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    const ok = window.confirm(`${ids.length}개의 채팅방을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`);
    if (!ok) return;
    await onDeleteSessions(ids);
    exitSelectionMode();
  };

  const commitEdit = (sessionId: number) => {
    onSaveTitle?.(sessionId);
  };

  return (
    <aside
      className={`flex h-full min-h-0 w-full sm:w-72 lg:w-80 shrink-0 flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 overflow-hidden ${className}`}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-800 px-3 py-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {selectionMode ? `${selectedIds.size}개 선택` : "채팅방"}
        </h2>
        <div className="flex items-center gap-1">
          {onDeleteSessions && !selectionMode && sessions.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectionMode(true)}
              className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:hover:border-red-900 dark:hover:bg-red-950/40 dark:hover:text-red-400"
              aria-label="채팅방 선택 삭제"
              title="채팅방 선택 삭제"
            >
              <Square size={16} strokeWidth={2} />
            </button>
          )}
          {selectionMode && (
            <button
              type="button"
              onClick={exitSelectionMode}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="선택 취소"
            >
              <X size={16} />
            </button>
          )}
          {onRefresh && !selectionMode && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="새로고침"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
          )}
          {!selectionMode && (
            <button
              type="button"
              onClick={onNewChat}
              disabled={creating}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {creating ? <Loader2 size={14} className="animate-spin" /> : <MessageSquarePlus size={14} />}
              새 대화
            </button>
          )}
        </div>
      </div>

      <ul className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
        {loading && sessions.length === 0 && (
          <li className="px-3 py-8 text-center text-sm text-gray-500">
            <Loader2 className="mx-auto mb-2 animate-spin text-indigo-500" size={20} />
            불러오는 중…
          </li>
        )}
        {!loading && sessions.length === 0 && (
          <li className="px-3 py-8 text-center text-sm text-gray-500">
            채팅방이 없습니다.
            <br />
            새 대화를 시작해 보세요.
          </li>
        )}
        {sessions.map((session) => {
          const active = activeId === session.id;
          const isEditing = editingSessionId === session.id;
          const checked = selectedIds.has(session.id);

          return (
            <li key={session.id}>
              <div
                className={`w-full rounded-xl px-3 py-3 transition-colors ${
                  selectionMode && checked
                    ? "bg-red-50 ring-1 ring-red-200 dark:bg-red-950/30 dark:ring-red-900"
                    : active && !selectionMode
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200"
                }`}
              >
                {isEditing ? (
                  <input
                    ref={editInputRef}
                    type="text"
                    value={editTitle}
                    onChange={(e) => onEditTitleChange?.(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitEdit(session.id);
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        onCancelEdit?.();
                      }
                    }}
                    onBlur={() => commitEdit(session.id)}
                    className={`w-full rounded-md border px-2 py-1 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-400 ${
                      active
                        ? "border-indigo-400 bg-white text-gray-900"
                        : "border-gray-300 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-950 dark:text-gray-100"
                    }`}
                    aria-label="채팅방 이름"
                    maxLength={128}
                  />
                ) : (
                  <div className="flex items-start gap-2">
                    {selectionMode && (
                      <button
                        type="button"
                        onClick={() => toggleSelect(session.id)}
                        className={`mt-0.5 shrink-0 rounded p-0.5 ${
                          checked
                            ? "text-red-600 dark:text-red-400"
                            : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        }`}
                        aria-label={checked ? "선택 해제" : "선택"}
                      >
                        {checked ? <CheckSquare size={18} /> : <Square size={18} strokeWidth={2} />}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (selectionMode) {
                          toggleSelect(session.id);
                          return;
                        }
                        onSelect(session.id);
                      }}
                      onDoubleClick={() => {
                        if (!selectionMode) onStartEdit?.(session.id, session.title);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center gap-1">
                        <p className="text-sm font-medium truncate flex-1">{session.title}</p>
                        {active && !selectionMode && onStartEdit && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              onStartEdit(session.id, session.title);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.stopPropagation();
                                onStartEdit(session.id, session.title);
                              }
                            }}
                            className={`shrink-0 rounded p-0.5 ${
                              active ? "hover:bg-indigo-500" : "hover:bg-gray-200 dark:hover:bg-gray-700"
                            }`}
                            aria-label="이름 수정"
                          >
                            <Pencil size={12} />
                          </span>
                        )}
                      </div>
                      <p
                        className={`mt-1 text-xs truncate ${
                          active && !selectionMode ? "text-indigo-100" : "text-gray-500"
                        }`}
                      >
                        메시지 {session.message_count}개 · {formatSessionDate(session.updated_at)}
                      </p>
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {selectionMode && sessions.length > 0 && (
        <div className="shrink-0 flex items-center gap-2 border-t border-gray-200 dark:border-gray-800 p-2">
          <button
            type="button"
            onClick={selectAll}
            className="flex-1 rounded-lg border border-gray-200 px-2 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            전체 선택
          </button>
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={selectedIds.size === 0 || deleting}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-600 px-2 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-40"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            삭제 ({selectedIds.size})
          </button>
        </div>
      )}
    </aside>
  );
}
