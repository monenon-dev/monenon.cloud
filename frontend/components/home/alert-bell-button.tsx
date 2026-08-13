"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

import { getAuthSession } from "@/lib/auth-api";
import {
  fetchProactiveAlerts,
  markProactiveAlertRead,
  type ProactiveAlertItem,
} from "@/lib/proactive-alerts-api";

const POLL_MS = 45_000;
const TOAST_MS = 3500;

function formatSentAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type AlertBellUi = {
  open: boolean;
  items: ProactiveAlertItem[];
  unreadCount: number;
  loading: boolean;
  toastMessage: string | null;
};

export function AlertBellButton() {
  const [ui, setUi] = useState<AlertBellUi>({
    open: false,
    items: [],
    unreadCount: 0,
    loading: false,
    toastMessage: null,
  });
  const knownIdsRef = useRef<Set<number> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const patchUi = (patch: Partial<AlertBellUi>) =>
    setUi((prev) => ({ ...prev, ...patch }));

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    patchUi({ toastMessage: message });
    toastTimerRef.current = setTimeout(() => {
      patchUi({ toastMessage: null });
      toastTimerRef.current = null;
    }, TOAST_MS);
  }, []);

  const pollUnread = useCallback(async () => {
    const session = getAuthSession();
    if (!session) return;
    try {
      const data = await fetchProactiveAlerts(session.user_id, { unreadOnly: true });
      const ids = new Set(data.items.map((item) => item.id));
      const prev = knownIdsRef.current;
      if (prev !== null) {
        const newest = data.items.find((item) => !prev.has(item.id));
        if (newest) {
          showToast(newest.message);
        }
      }
      knownIdsRef.current = ids;
      patchUi({ unreadCount: data.unread_count });
    } catch {
      /* 폴링 실패는 조용히 무시 */
    }
  }, [showToast]);

  const loadList = useCallback(async () => {
    const session = getAuthSession();
    if (!session) return;
    patchUi({ loading: true });
    try {
      const data = await fetchProactiveAlerts(session.user_id, { unreadOnly: false });
      knownIdsRef.current = new Set(
        data.items.filter((item) => !item.is_read).map((item) => item.id)
      );
      patchUi({
        items: data.items,
        unreadCount: data.unread_count,
        loading: false,
      });
    } catch {
      patchUi({ loading: false });
    }
  }, []);

  useEffect(() => {
    const session = getAuthSession();
    if (!session) return;
    void pollUnread();
    const timer = setInterval(() => {
      void pollUnread();
    }, POLL_MS);
    return () => {
      clearInterval(timer);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [pollUnread]);

  useEffect(() => {
    if (!ui.open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        patchUi({ open: false });
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [ui.open]);

  const toggleOpen = async () => {
    const next = !ui.open;
    patchUi({ open: next });
    if (next) await loadList();
  };

  const onItemClick = async (item: ProactiveAlertItem) => {
    if (item.is_read) return;
    const session = getAuthSession();
    if (!session) return;
    try {
      const updated = await markProactiveAlertRead(session.user_id, item.id);
      setUi((prev) => ({
        ...prev,
        items: prev.items.map((row) => (row.id === item.id ? updated : row)),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));
      knownIdsRef.current?.delete(item.id);
    } catch {
      /* ignore */
    }
  };

  if (!getAuthSession()) return null;

  return (
    <>
      <div className="relative" ref={panelRef}>
        <button
          type="button"
          onClick={() => void toggleOpen()}
          className="relative inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 text-indigo-100 transition-colors hover:bg-white/10"
          aria-label="알림"
          aria-expanded={ui.open}
        >
          <Bell size={18} className="text-amber-200/90" />
          {ui.unreadCount > 0 ? (
            <span
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[rgba(10,10,15,0.9)]"
              aria-hidden
            />
          ) : null}
        </button>

        {ui.open ? (
          <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/10 bg-[rgba(10,10,16,0.97)] shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
              <p className="text-sm font-medium text-indigo-100">알림</p>
              <span className="text-[11px] text-indigo-300/80">
                안 읽음 {ui.unreadCount}
              </span>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {ui.loading ? (
                <p className="px-3 py-6 text-center text-sm text-indigo-300/70">불러오는 중…</p>
              ) : ui.items.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-indigo-300/70">
                  최근 알림이 없습니다.
                </p>
              ) : (
                <ul className="divide-y divide-white/5">
                  {ui.items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => void onItemClick(item)}
                        className={`flex w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04] ${
                          item.is_read ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!item.is_read ? (
                            <span
                              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400"
                              aria-hidden
                            />
                          ) : (
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0" aria-hidden />
                          )}
                          <p className="min-w-0 flex-1 text-sm leading-snug text-indigo-50">
                            {item.message}
                          </p>
                        </div>
                        <div className="flex items-center justify-between pl-3.5 text-[11px] text-indigo-300/70">
                          <span>{formatSentAt(item.sent_at)}</span>
                          <span>{item.is_read ? "읽음" : "안 읽음"}</span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {ui.toastMessage ? (
        <div
          role="status"
          className="pointer-events-none fixed right-4 top-16 z-[60] max-w-sm rounded-xl border border-amber-400/25 bg-[rgba(10,10,16,0.96)] px-4 py-3 text-sm text-indigo-50 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md sm:top-20"
        >
          <p className="mb-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-200/90">
            새 알림
          </p>
          <p className="leading-snug">{ui.toastMessage}</p>
        </div>
      ) : null}
    </>
  );
}
