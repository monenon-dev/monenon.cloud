"use client";

import { FormEvent, useState } from "react";
import { Loader2, MessageSquarePlus, Pencil, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  type ChatSessionItem,
  formatSessionDate,
} from "@/lib/chat-sessions";

interface ChatSessionsSidebarProps {
  sessions: ChatSessionItem[];
  activeSessionId: number | null;
  loading?: boolean;
  onSelectSession: (sessionId: number) => void;
  onNewChat: () => void;
  onRenameSession: (sessionId: number, title: string) => Promise<void>;
  onDeleteSession: (sessionId: number) => Promise<void>;
}

export function ChatSessionsSidebar({
  sessions,
  activeSessionId,
  loading = false,
  onSelectSession,
  onNewChat,
  onRenameSession,
  onDeleteSession,
}: ChatSessionsSidebarProps) {
  const [ui, setUi] = useState({
    editingId: null as number | null,
    editTitle: "",
    saving: false,
    deleteTarget: null as ChatSessionItem | null,
    deleting: false,
  });

  const patchUi = (patch: Partial<typeof ui>) => setUi((prev) => ({ ...prev, ...patch }));

  const startEdit = (session: ChatSessionItem) => {
    patchUi({ editingId: session.id, editTitle: session.title });
  };

  const cancelEdit = () => {
    patchUi({ editingId: null, editTitle: "" });
  };

  const submitRename = async (e: FormEvent) => {
    e.preventDefault();
    if (ui.editingId === null) return;
    const trimmed = ui.editTitle.trim();
    if (!trimmed) return;

    patchUi({ saving: true });
    try {
      await onRenameSession(ui.editingId, trimmed);
      cancelEdit();
    } finally {
      patchUi({ saving: false });
    }
  };

  const confirmDelete = async () => {
    if (!ui.deleteTarget) return;
    patchUi({ deleting: true });
    try {
      await onDeleteSession(ui.deleteTarget.id);
      patchUi({ deleteTarget: null });
    } finally {
      patchUi({ deleting: false });
    }
  };

  return (
    <aside className="flex h-full w-full flex-col border-r border-gray-200 bg-gray-50/80 dark:border-gray-800 dark:bg-gray-900/40">
      <div className="shrink-0 border-b border-gray-200 p-3 dark:border-gray-800">
        <button
          type="button"
          onClick={onNewChat}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <MessageSquarePlus size={18} />
          새 대화
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-6 animate-spin text-indigo-500" aria-label="목록 로딩 중" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-gray-500 dark:text-gray-400">
            채팅방이 없습니다.
            <br />
            새 대화를 시작해 보세요.
          </p>
        ) : (
          <ul className="space-y-0.5" role="listbox" aria-label="채팅방 목록">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isEditing = ui.editingId === session.id;

              return (
                <li key={session.id} className="group relative">
                  {isEditing ? (
                    <form
                      onSubmit={(e) => void submitRename(e)}
                      className="rounded-lg border border-indigo-300 bg-white p-2 dark:border-indigo-700 dark:bg-gray-950"
                    >
                      <input
                        type="text"
                        value={ui.editTitle}
                        onChange={(e) => patchUi({ editTitle: e.target.value })}
                        maxLength={64}
                        autoFocus
                        disabled={ui.saving}
                        className="w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-700 dark:bg-gray-900"
                        aria-label="채팅방 이름"
                      />
                      <div className="mt-2 flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          disabled={ui.saving}
                          className="rounded-md px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                          취소
                        </button>
                        <button
                          type="submit"
                          disabled={ui.saving || !ui.editTitle.trim()}
                          className="rounded-md bg-indigo-600 px-2 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                          저장
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <button
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        onClick={() => onSelectSession(session.id)}
                        className={`w-full rounded-lg py-2.5 pl-3 pr-14 text-left transition-colors ${
                          isActive
                            ? "bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-100"
                            : "text-gray-700 hover:bg-white dark:text-gray-300 dark:hover:bg-gray-800"
                        }`}
                      >
                        <p className="truncate text-sm font-medium">{session.title}</p>
                        <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                          {formatSessionDate(session.updated_at)}
                          {session.message_count > 0 ? ` · ${session.message_count}개` : ""}
                        </p>
                      </button>
                      <div className="absolute right-1 top-1.5 flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(session);
                          }}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-white hover:text-indigo-600 dark:hover:bg-gray-800 dark:hover:text-indigo-400"
                          aria-label={`${session.title} 이름 변경`}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            patchUi({ deleteTarget: session });
                          }}
                          className="rounded-md p-1.5 text-gray-500 hover:bg-white hover:text-red-600 dark:hover:bg-gray-800 dark:hover:text-red-400"
                          aria-label={`${session.title} 삭제`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AlertDialog
        open={ui.deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) patchUi({ deleteTarget: null });
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>채팅방을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              「{ui.deleteTarget?.title}」과 모든 메시지가 삭제됩니다. 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={ui.deleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={ui.deleting}
              className="bg-red-600 hover:bg-red-700"
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
            >
              {ui.deleting ? "삭제 중…" : "삭제"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  );
}
