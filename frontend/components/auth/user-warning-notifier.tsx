"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";

import { getAuthSession } from "@/lib/auth-api";
import { routes } from "@/lib/routes";
import { fetchUserWarnings, type Warning } from "@/lib/warnings-api";

function lastSeenKey(userId: number): string {
  return `monenon_warning_last_seen_${userId}`;
}

function getLastSeenWarningId(userId: number): number {
  const raw = localStorage.getItem(lastSeenKey(userId));
  const parsed = raw ? Number(raw) : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function setLastSeenWarningId(userId: number, warningId: number): void {
  localStorage.setItem(lastSeenKey(userId), String(warningId));
}

export function UserWarningNotifier() {
  const pathname = usePathname();
  const [pending, setPending] = useState<Warning[]>([]);

  const checkWarnings = useCallback(async () => {
    if (pathname.startsWith(routes.oauth.admin.root)) return;

    const session = getAuthSession();
    if (!session) return;

    const warnings = await fetchUserWarnings(session.user_id);
    if (warnings.length === 0) return;

    const lastSeen = getLastSeenWarningId(session.user_id);
    const fresh = warnings
      .filter((warning) => warning.id > lastSeen)
      .sort((a, b) => b.id - a.id);

    if (fresh.length > 0) {
      setPending(fresh);
    }
  }, [pathname]);

  useEffect(() => {
    void checkWarnings();
    const intervalId = window.setInterval(() => void checkWarnings(), 15_000);
    const onFocus = () => void checkWarnings();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
    };
  }, [checkWarnings]);

  const dismiss = () => {
    const session = getAuthSession();
    if (session && pending.length > 0) {
      const maxId = Math.max(...pending.map((warning) => warning.id));
      setLastSeenWarningId(session.user_id, maxId);
    }
    setPending([]);
  };

  if (pending.length === 0) return null;

  const latest = pending[0];

  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex justify-center p-4 pointer-events-none">
      <div
        role="alert"
        className="pointer-events-auto w-full max-w-lg rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 shadow-lg dark:border-amber-800 dark:bg-amber-950/95"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-amber-200 p-2 text-amber-900 dark:bg-amber-900 dark:text-amber-100">
            <AlertTriangle size={18} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
              관리자 경고 알림
            </p>
            <p className="mt-1 text-sm leading-relaxed text-amber-900 dark:text-amber-100">
              {latest.message}
            </p>
            {pending.length > 1 && (
              <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
                확인하지 않은 경고 {pending.length}건이 있습니다.
              </p>
            )}
            <button
              type="button"
              onClick={dismiss}
              className="mt-3 inline-flex rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            >
              확인
            </button>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-1 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900"
            aria-label="알림 닫기"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
