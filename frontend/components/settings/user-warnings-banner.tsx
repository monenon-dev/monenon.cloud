"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

import { fetchUserWarnings, type Warning } from "@/lib/warnings-api";
import { getSessionUserId } from "@/lib/session-user";

export function UserWarningsBanner() {
  const [warnings, setWarnings] = useState<Warning[]>([]);

  useEffect(() => {
    const userId = getSessionUserId();
    if (!userId) return;
    fetchUserWarnings(userId).then(setWarnings).catch(() => setWarnings([]));
  }, []);

  if (warnings.length === 0) return null;

  return (
    <div className="mb-6 space-y-3">
      {warnings.map((w) => (
        <div
          key={w.id}
          className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100"
          role="alert"
        >
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <div>
            <p className="font-semibold">관리자 경고</p>
            <p className="mt-1 whitespace-pre-wrap">{w.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
