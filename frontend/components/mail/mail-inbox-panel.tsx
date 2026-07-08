"use client";

import { useEffect, useState } from "react";
import { Inbox, Loader2, RefreshCw, ShieldCheck, Trash2, UserPlus } from "lucide-react";

import {
  addMailAllowlistEmail,
  loadMailAllowlist,
  removeMailAllowlistEmail,
} from "@/lib/mail-allowlist";
import { syncMailInbox } from "@/lib/mail-inbox-api";
import type { InboxMessage } from "@/lib/mail-inbox-types";

export function MailInboxPanel() {
  const [ui, setUi] = useState({
    loading: false,
    error: null as string | null,
    allowlist: [] as string[],
    messages: [] as InboxMessage[],
    totalCount: 0,
    mounted: false,
  });

  const patchUi = (patch: Partial<typeof ui>) => setUi((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    patchUi({ mounted: true, allowlist: loadMailAllowlist() });
  }, []);

  const handleAddAllowlist = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formProps = Object.fromEntries(new FormData(e.currentTarget).entries());
    const email = String(formProps.email ?? "").trim().toLowerCase();
    if (!email.includes("@")) {
      patchUi({ error: "올바른 이메일 주소를 입력하세요." });
      return;
    }
    patchUi({
      allowlist: addMailAllowlistEmail(email, ui.allowlist),
      error: null,
    });
    e.currentTarget.reset();
  };

  const handleRemoveAllowlist = (email: string) => {
    patchUi({
      allowlist: removeMailAllowlistEmail(email, ui.allowlist),
    });
  };

  const handleSync = async () => {
    if (ui.allowlist.length === 0) {
      patchUi({ error: "허용 발신자를 먼저 등록하세요." });
      return;
    }

    patchUi({ loading: true, error: null });
    try {
      const result = await syncMailInbox(ui.allowlist);
      patchUi({
        messages: result.messages,
        totalCount: result.totalCount,
      });
    } catch (err) {
      patchUi({
        error: err instanceof Error ? err.message : "수신함을 불러오지 못했습니다.",
      });
    } finally {
      patchUi({ loading: false });
    }
  };

  if (!ui.mounted) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-indigo-600" aria-label="로딩 중" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
          <ShieldCheck className="size-4 text-indigo-600" />
          허용 발신자
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          등록한 주소에서 온 Gmail만 Gemini가 걸러 수신함에 표시합니다.
        </p>

        <form onSubmit={handleAddAllowlist} className="flex gap-2">
          <input
            name="email"
            type="email"
            required
            placeholder="allowed@example.com"
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1 rounded-lg bg-gray-900 dark:bg-gray-100 px-3 py-2 text-xs font-medium text-white dark:text-gray-900"
          >
            <UserPlus className="size-3.5" />
            추가
          </button>
        </form>

        {ui.allowlist.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">허용할 발신자가 없습니다.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {ui.allowlist.map((email) => (
              <li
                key={email}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs"
              >
                <span>{email}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAllowlist(email)}
                  className="text-gray-400 hover:text-red-500"
                  aria-label={`${email} 삭제`}
                >
                  <Trash2 className="size-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-gray-200">
            <Inbox className="size-4 text-indigo-600" />
            수신함
            {ui.messages.length > 0 && (
              <span className="text-xs font-normal text-gray-500">
                {ui.messages.length}
                {ui.totalCount > ui.messages.length ? ` / ${ui.totalCount}건 중 허용` : "건"}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => void handleSync()}
            disabled={ui.loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-900 disabled:opacity-60"
          >
            {ui.loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            새로고침
          </button>
        </div>

        {ui.error && (
          <p
            role="alert"
            className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2"
          >
            {ui.error}
          </p>
        )}

        {ui.messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            허용 발신자를 등록한 뒤 새로고침하세요.
            <br />
            n8n Gmail 트리거 → Webhook(<code className="text-xs">mail-inbox</code>) 연동이 필요합니다.
          </div>
        ) : (
          <ul className="space-y-2 max-h-[28rem] overflow-y-auto pr-1">
            {ui.messages.map((msg) => (
              <li
                key={msg.id}
                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-3 space-y-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{msg.from}</p>
                  <time className="shrink-0 text-[11px] text-gray-400">
                    {new Date(msg.receivedAt).toLocaleString("ko-KR")}
                  </time>
                </div>
                <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">{msg.subject}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 whitespace-pre-wrap">
                  {msg.snippet || "(내용 없음)"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
