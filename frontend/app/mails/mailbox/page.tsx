"use client";

/**
 * /mailbox — Gemini 필터링 수신함
 *
 * Gmail에 메일이 오면 n8n → 백엔드 → Gemini 필터링 후
 * 사전에 허용한 메일 주소의 메일만 이 페이지에 표시됩니다.
 * 각 메일은 Gemini가 자동 요약한 내용을 함께 보여줍니다.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCheck,
  Loader2,
  Mail,
  MailOpen,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { getSessionUserId } from "@/lib/session-user";
import {
  deleteMail,
  fetchAllowedSenders,
  fetchInbox,
  markAsRead,
  type AllowedSender,
  type InboxMail,
} from "@/lib/mail-api";
import { routes } from "@/lib/routes";

// ── 유틸 ──────────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "방금";
  if (mins < 60) return `${mins}분 전`;
  if (mins < 1440) return `${Math.floor(mins / 60)}시간 전`;
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

// ── 메일 상세 모달 ────────────────────────────────────────────────────────────

function MailModal({
  mail,
  onClose,
  onDelete,
}: {
  mail: InboxMail;
  onClose: () => void;
  onDelete: (id: number) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-snug">
                {mail.subject}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {mail.from_name
                  ? `${mail.from_name} · ${mail.from_email}`
                  : mail.from_email}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">
                {new Date(mail.received_at).toLocaleString("ko-KR")}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => { onDelete(mail.id); onClose(); }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                title="삭제"
              >
                <Trash2 className="size-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Gemini 요약 */}
        {mail.gemini_summary && (
          <div className="mx-6 mt-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border border-indigo-100 dark:border-indigo-900/50 px-5 py-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="size-3.5 text-indigo-500" />
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                Gemini 자동 요약
              </span>
            </div>
            <p className="text-sm text-indigo-800 dark:text-indigo-200 leading-relaxed">
              {mail.gemini_summary}
            </p>
          </div>
        )}

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-6">
          {mail.body_text ? (
            <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-sans">
              {mail.body_text}
            </pre>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-600 italic text-center py-8">
              본문이 없습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── 허용 발신자 배지 ──────────────────────────────────────────────────────────

function AllowedBadge({ senders }: { senders: AllowedSender[] }) {
  if (senders.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Shield className="size-3.5 text-green-500 shrink-0" />
      {senders.slice(0, 3).map(s => (
        <span
          key={s.id}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-900"
        >
          {s.label || s.email}
        </span>
      ))}
      {senders.length > 3 && (
        <span className="text-xs text-gray-400 dark:text-gray-600">
          +{senders.length - 3}명
        </span>
      )}
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function MailboxPage() {
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [inbox, setInbox] = useState<InboxMail[]>([]);
  const [senders, setSenders] = useState<AllowedSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<InboxMail | null>(null);

  useEffect(() => {
    setMounted(true);
    setUserId(getSessionUserId());
  }, []);

  const loadData = useCallback(async (uid: number, silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const [mails, senderList] = await Promise.all([
        fetchInbox(uid),
        fetchAllowedSenders(uid),
      ]);
      setInbox(mails);
      setSenders(senderList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "불러오지 못했습니다.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (userId) loadData(userId);
    else if (mounted) setLoading(false);
  }, [userId, mounted, loadData]);

  const handleClick = async (mail: InboxMail) => {
    setSelected(mail);
    if (!mail.is_read && userId) {
      try {
        const updated = await markAsRead(userId, mail.id);
        setInbox(prev => prev.map(m => m.id === updated.id ? updated : m));
        setSelected(updated);
      } catch { }
    }
  };

  const handleDelete = async (mailId: number) => {
    if (!userId) return;
    try {
      await deleteMail(userId, mailId);
      setInbox(prev => prev.filter(m => m.id !== mailId));
    } catch { }
  };

  const unreadCount = inbox.filter(m => !m.is_read).length;

  if (!mounted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="size-8 animate-spin text-indigo-600" />
      </main>
    );
  }

  if (!userId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">로그인이 필요합니다.</p>
          <Link href={routes.oauth.login} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition-colors">
            로그인
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {selected && (
        <MailModal
          mail={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
        />
      )}

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">수신함</h1>
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-5 px-1.5 rounded-full bg-indigo-600 text-white text-xs font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="mt-1">
                <AllowedBadge senders={senders} />
              </div>
            </div>
          </div>

          <button
            onClick={() => loadData(userId, true)}
            disabled={refreshing}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            title="새로고침"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Gemini 필터 안내 */}
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 mb-6 text-sm text-indigo-700 dark:text-indigo-300">
          <Sparkles className="size-4 shrink-0 text-indigo-500" />
          <span>Gmail 수신 → Gemini 필터링 → 허용된 발신자 메일만 표시 · 자동 요약</span>
        </div>

        {/* 수신함 */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="size-8 animate-spin text-indigo-500" />
            <p className="text-sm text-gray-400 dark:text-gray-600">메일을 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-8 text-center">
            <p className="text-sm text-red-600 dark:text-red-400 mb-3">{error}</p>
            <button
              onClick={() => loadData(userId)}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              다시 시도
            </button>
          </div>
        ) : inbox.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <Mail className="size-8 text-gray-400 dark:text-gray-600" />
            </div>
            <p className="font-medium text-gray-600 dark:text-gray-400">수신된 메일이 없습니다</p>
            <p className="text-sm text-gray-400 dark:text-gray-600 mt-1 max-w-xs leading-relaxed">
              허용된 발신자에게서 메일이 오면 Gemini가 필터링해서 여기에 표시합니다
            </p>
            <Link
              href={routes.mails.mail}
              className="mt-4 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              발신자 허용 목록 관리 →
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {inbox.map(mail => (
              <li key={mail.id}>
                <button
                  onClick={() => handleClick(mail)}
                  className={`w-full text-left rounded-2xl border transition-all hover:shadow-md group ${
                    mail.is_read
                      ? "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/50"
                      : "border-indigo-100 dark:border-indigo-900/60 bg-white dark:bg-gray-900 shadow-sm"
                  }`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* 아이콘 */}
                        <div className={`shrink-0 mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center ${
                          mail.is_read
                            ? "bg-gray-100 dark:bg-gray-800"
                            : "bg-indigo-100 dark:bg-indigo-950"
                        }`}>
                          {mail.is_read
                            ? <MailOpen className="size-4 text-gray-400 dark:text-gray-500" />
                            : <Mail className="size-4 text-indigo-600 dark:text-indigo-400" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          {/* 발신자 + 미읽음 표시 */}
                          <div className="flex items-center gap-2">
                            <span className={`text-sm truncate ${
                              !mail.is_read
                                ? "font-semibold text-gray-900 dark:text-gray-100"
                                : "font-medium text-gray-600 dark:text-gray-400"
                            }`}>
                              {mail.from_name || mail.from_email}
                            </span>
                            {!mail.is_read && (
                              <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            )}
                          </div>

                          {/* 제목 */}
                          <p className={`text-sm truncate mt-0.5 ${
                            !mail.is_read
                              ? "text-gray-800 dark:text-gray-200 font-medium"
                              : "text-gray-500 dark:text-gray-500"
                          }`}>
                            {mail.subject}
                          </p>

                          {/* Gemini 요약 */}
                          {mail.gemini_summary && (
                            <div className="flex items-start gap-1.5 mt-2">
                              <Sparkles className="size-3 text-indigo-400 shrink-0 mt-0.5" />
                              <p className="text-xs text-gray-500 dark:text-gray-500 line-clamp-2 leading-relaxed">
                                {mail.gemini_summary}
                              </p>
                            </div>
                          )}

                          {/* 읽음 표시 */}
                          {mail.is_read && (
                            <div className="flex items-center gap-1 mt-1.5">
                              <CheckCheck className="size-3 text-gray-300 dark:text-gray-700" />
                              <span className="text-xs text-gray-300 dark:text-gray-700">읽음</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 날짜 + 삭제 */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-xs text-gray-400 dark:text-gray-600 whitespace-nowrap">
                          {formatDate(mail.received_at)}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(mail.id); }}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 dark:text-gray-700 hover:text-red-500 transition-all"
                          title="삭제"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
