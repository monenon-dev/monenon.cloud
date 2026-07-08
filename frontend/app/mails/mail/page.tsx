"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCheck,
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  Plus,
  Send,
  Shield,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { getSessionUserId } from "@/lib/session-user";
import { ContactAutocomplete } from "@/components/mail/contact-autocomplete";
import {
  addAllowedSender,
  deleteAllowedSender,
  deleteMail,
  fetchAllowedSenders,
  fetchInbox,
  markAsRead,
  sendMail,
  type AllowedSender,
  type InboxMail,
  type MailSendResult,
} from "@/lib/mail-api";
import { routes } from "@/lib/routes";

// ── 날짜 포맷 ─────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (isToday) return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

// ── 허용 발신자 패널 ──────────────────────────────────────────────────────────

function AllowedSendersPanel({
  userId, senders, onSendersChange,
}: {
  userId: number;
  senders: AllowedSender[];
  onSendersChange: () => void;
}) {
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true); setError(null);
    try {
      await addAllowedSender(userId, email.trim(), label.trim() || null);
      setEmail(""); setLabel(""); onSendersChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    try { await deleteAllowedSender(userId, id); onSendersChange(); } catch { }
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/40 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="size-4 text-indigo-500" />
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">허용 발신자</h2>
      </div>
      <form onSubmit={handleAdd} className="space-y-2 mb-4">
        {error && <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-2 py-1">{error}</p>}
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@gmail.com" required
          className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
        <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="별칭 (선택)" maxLength={64}
          className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
        <button type="submit" disabled={loading}
          className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors">
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />} 추가
        </button>
      </form>
      <ul className="space-y-1.5">
        {senders.length === 0 && <li className="text-xs text-gray-400 dark:text-gray-600 text-center py-2">허용된 발신자가 없습니다</li>}
        {senders.map(s => (
          <li key={s.id} className="flex items-center justify-between gap-2 text-xs text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-950 rounded-xl px-3 py-2 border border-gray-100 dark:border-gray-800">
            <div className="min-w-0">
              <p className="truncate font-medium">{s.label || s.email}</p>
              {s.label && <p className="truncate text-gray-400 dark:text-gray-500">{s.email}</p>}
            </div>
            <button onClick={() => handleDelete(s.id)} className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"><X className="size-3.5" /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── 메일 상세 모달 ────────────────────────────────────────────────────────────

function MailDetail({ mail, onClose, onDelete }: { mail: InboxMail; onClose: () => void; onDelete: (id: number) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-xl">
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100 dark:border-gray-800">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 leading-snug">{mail.subject}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{mail.from_name ? `${mail.from_name} <${mail.from_email}>` : mail.from_email}</p>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">{formatDate(mail.received_at)}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => { onDelete(mail.id); onClose(); }} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="size-4" /></button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"><X className="size-5" /></button>
          </div>
        </div>
        {mail.gemini_summary && (
          <div className="mx-5 mt-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 px-4 py-3">
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">Gemini 요약</p>
            <p className="text-sm text-indigo-800 dark:text-indigo-200 leading-relaxed">{mail.gemini_summary}</p>
          </div>
        )}
        <div className="overflow-y-auto flex-1 p-5">
          {mail.body_text
            ? <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-sans">{mail.body_text}</pre>
            : <p className="text-sm text-gray-400 dark:text-gray-600 italic">본문이 없습니다.</p>}
        </div>
      </div>
    </div>
  );
}

// ── AI 메일 작성 탭 (채팅형) ──────────────────────────────────────────────────

type ChatMessage = { role: "user" | "ai"; text: string };

function ComposeTab({ userId }: { userId: number }) {
  const [toEmail, setToEmail] = useState("");
  const [input, setInput] = useState("");
  // Google OAuth access_token (로그인 시 sessionStorage에 저장됨)
  const googleToken = typeof window !== "undefined"
    ? sessionStorage.getItem("google_access_token")
    : null;
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "ai", text: "안녕하세요! 받는 사람 이메일과 보낼 내용을 알려주시면 Gemini가 메일을 작성해 드립니다." }
  ]);
  const [preview, setPreview] = useState<MailSendResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !toEmail.trim()) return;

    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    setLoading(true);
    setPreview(null);
    setSent(false);

    try {
      const result = await sendMail(userId, toEmail.trim(), userMsg);
      setPreview(result);
      setMessages(prev => [...prev, {
        role: "ai",
        text: `메일을 작성했습니다!\n\n📧 제목: ${result.subject}\n\n${result.body}\n\n위 내용으로 발송하시겠습니까?`
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "ai", text: `오류가 발생했습니다: ${err instanceof Error ? err.message : "알 수 없는 오류"}` }]);
    } finally { setLoading(false); }
  };

  const handleConfirmSend = () => {
    setSent(true);
    setPreview(null);
    setMessages(prev => [...prev, { role: "ai", text: `✅ ${toEmail}로 메일이 발송되었습니다!` }]);
  };

  return (
    <div className="flex gap-6 items-start h-[calc(100vh-180px)]">
      {/* 채팅 영역 */}
      <div className="flex-1 flex flex-col border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-white dark:bg-gray-950">
        {/* 받는 사람 입력 */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/40">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">받는 사람</span>
            <ContactAutocomplete
              value={toEmail}
              onChange={setToEmail}
              googleToken={googleToken}
              placeholder="이름 또는 이메일 (주소록 자동완성)"
              className="flex-1 px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "ai" && (
                <div className="shrink-0 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center mr-2 mt-0.5">
                  <Sparkles className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-sm"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm"
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="shrink-0 w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center mr-2">
                <Sparkles className="size-3.5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-2.5">
                <Loader2 className="size-4 animate-spin text-indigo-500" />
              </div>
            </div>
          )}
          {preview && !sent && (
            <div className="flex justify-start">
              <div className="ml-9 flex gap-2">
                <button onClick={handleConfirmSend}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
                  <Send className="size-3.5" /> 발송하기
                </button>
                <button onClick={() => setPreview(null)}
                  className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
                  취소
                </button>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* 입력창 */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="어떤 내용의 메일을 보낼까요? (예: 내일 오후 2시 미팅 일정 확인)"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm focus:ring-1 focus:ring-indigo-500 outline-none disabled:opacity-60"
            />
            <button type="submit" disabled={loading || !input.trim() || !toEmail.trim()}
              className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors">
              <Send className="size-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 수신함 탭 ─────────────────────────────────────────────────────────────────

function InboxTab({
  userId, inbox, senders, loading, error, onReload, onSendersChange,
}: {
  userId: number; inbox: InboxMail[]; senders: AllowedSender[];
  loading: boolean; error: string | null;
  onReload: () => void; onSendersChange: () => void;
}) {
  const [selected, setSelected] = useState<InboxMail | null>(null);

  const handleMailClick = async (mail: InboxMail) => {
    setSelected(mail);
    if (!mail.is_read) {
      try {
        const updated = await markAsRead(userId, mail.id);
        setSelected(updated);
      } catch { }
    }
  };

  const handleDelete = async (mailId: number) => {
    try { await deleteMail(userId, mailId); onReload(); } catch { }
  };

  return (
    <div className="flex gap-6 items-start">
      {selected && <MailDetail mail={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />}
      <aside className="w-64 shrink-0">
        <AllowedSendersPanel userId={userId} senders={senders} onSendersChange={onSendersChange} />
      </aside>
      <section className="flex-1 min-w-0">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="size-8 animate-spin text-indigo-600" /></div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-6 text-center">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <button onClick={onReload} className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline">다시 시도</button>
          </div>
        ) : inbox.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Mail className="size-10 text-gray-300 dark:text-gray-700 mb-3" />
            <p className="text-gray-500 dark:text-gray-500 text-sm">수신된 메일이 없습니다.</p>
            <p className="text-gray-400 dark:text-gray-600 text-xs mt-1">n8n Gmail 트리거를 활성화하면 자동으로 표시됩니다.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {inbox.map(mail => (
              <li key={mail.id}>
                <button onClick={() => handleMailClick(mail)}
                  className={`w-full text-left rounded-2xl border px-4 py-3.5 transition-all hover:shadow-sm ${mail.is_read ? "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30" : "border-indigo-100 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {mail.is_read ? <MailOpen className="size-4 text-gray-400 dark:text-gray-600" /> : <Mail className="size-4 text-indigo-500" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm truncate ${!mail.is_read ? "font-semibold" : "font-medium text-gray-600 dark:text-gray-400"}`}>
                            {mail.from_name || mail.from_email}
                          </span>
                          {!mail.is_read && <span className="inline-block size-1.5 rounded-full bg-indigo-500 shrink-0" />}
                        </div>
                        <p className={`text-sm truncate mt-0.5 ${!mail.is_read ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-600 dark:text-gray-400"}`}>{mail.subject}</p>
                        {mail.gemini_summary && <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-1">{mail.gemini_summary}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400 dark:text-gray-600 whitespace-nowrap">{formatDate(mail.received_at)}</span>
                      <button onClick={e => { e.stopPropagation(); handleDelete(mail.id); }} className="text-gray-300 dark:text-gray-700 hover:text-red-500 transition-colors">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  {mail.is_read && (
                    <div className="flex items-center gap-1 mt-1.5 ml-7">
                      <CheckCheck className="size-3 text-gray-300 dark:text-gray-700" />
                      <span className="text-xs text-gray-300 dark:text-gray-700">읽음</span>
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

type Tab = "inbox" | "compose";

export default function MailPage() {
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("inbox");
  const [inbox, setInbox] = useState<InboxMail[]>([]);
  const [senders, setSenders] = useState<AllowedSender[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setMounted(true); setUserId(getSessionUserId()); }, []);

  const loadData = useCallback(async (uid: number) => {
    setLoading(true); setError(null);
    try {
      const [mails, senderList] = await Promise.all([fetchInbox(uid), fetchAllowedSenders(uid)]);
      setInbox(mails); setSenders(senderList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "데이터를 불러오지 못했습니다.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (userId) loadData(userId);
    else if (mounted) setLoading(false);
  }, [userId, mounted, loadData]);

  const unreadCount = inbox.filter(m => !m.is_read).length;

  if (!mounted) return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <Loader2 className="size-8 animate-spin text-indigo-600" />
    </main>
  );

  if (!userId) return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-400 mb-4">메일함을 사용하려면 로그인이 필요합니다.</p>
        <Link href={routes.oauth.login} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
          로그인하기
        </Link>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="text-xl font-bold">메일</h1>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl bg-gray-100 dark:bg-gray-900 w-fit">
          <button
            onClick={() => setTab("inbox")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "inbox"
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Inbox className="size-4" />
            수신함
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-indigo-600 text-white text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab("compose")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "compose"
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <Sparkles className="size-4" />
            AI 메일 작성
          </button>
        </div>

        {/* 탭 콘텐츠 */}
        {tab === "inbox" ? (
          <InboxTab
            userId={userId}
            inbox={inbox}
            senders={senders}
            loading={loading}
            error={error}
            onReload={() => loadData(userId)}
            onSendersChange={() => loadData(userId)}
          />
        ) : (
          <ComposeTab userId={userId} />
        )}
      </div>
    </main>
  );
}
