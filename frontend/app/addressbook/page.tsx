"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookUser,
  FileUp,
  Loader2,
  Mail,
  Phone,
  Search,
  Trash2,
  Upload,
  User,
  X,
} from "lucide-react";

import { getSessionUserId } from "@/lib/session-user";
import { getApiBaseUrl } from "@/lib/api-base";
import { routes } from "@/lib/routes";

const api = getApiBaseUrl();

type Contact = { id: number; name: string; email: string; phone: string | null };

// ── 업로드 모달 ───────────────────────────────────────────────────────────────

function UploadModal({ userId, onClose, onSuccess }: {
  userId: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ added: number; total_parsed: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    if (!file) { setMessage("CSV 파일을 먼저 선택하세요."); return; }
    setUploading(true); setMessage(""); setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${api}/addressbook/upload?user_id=${userId}`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "업로드 실패");
      setResult(data);
      setMessage(`완료! ${data.added}명 추가됨 (총 ${data.total_parsed}명 파싱)`);
      onSuccess();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally { setUploading(false); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <FileUp className="size-5 text-indigo-500" />
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">주소록 업로드</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            <X className="size-5" />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 space-y-4">
          {/* 안내 */}
          <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 px-4 py-3 text-sm text-indigo-700 dark:text-indigo-300 space-y-1">
            <p className="font-semibold">Google 주소록 CSV 다운로드 방법</p>
            <ol className="list-decimal list-inside space-y-0.5 text-xs">
              <li><a href="https://contacts.google.com" target="_blank" rel="noreferrer" className="underline">contacts.google.com</a> 접속</li>
              <li>왼쪽 메뉴 → <strong>내보내기</strong> 클릭</li>
              <li><strong>Google CSV</strong> 선택 → 내보내기</li>
            </ol>
          </div>

          {/* 파일 업로드 영역 */}
          <div
            className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-8 text-center cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            <div className="mx-auto w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
              <Upload className="size-6 text-gray-400" />
            </div>
            {file ? (
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{file.name}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">CSV 파일을 클릭해서 선택하세요</p>
                <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Google Contacts CSV 형식</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => { setFile(e.target.files?.[0] ?? null); setMessage(""); }}
            />
          </div>

          {/* 메시지 */}
          {message && (
            <p className={`text-sm rounded-xl px-3 py-2 ${
              result ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300" : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400"
            }`}>
              {message}
            </p>
          )}

          {/* 버튼 */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
            {uploading ? "업로드 중..." : "업로드"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 메인 페이지 ───────────────────────────────────────────────────────────────

export default function AddressBookPage() {
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => { setMounted(true); setUserId(getSessionUserId()); }, []);

  const loadContacts = useCallback(async (uid: number, q = "") => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ user_id: String(uid) });
      if (q) params.set("q", q);
      const res = await fetch(`${api}/addressbook/contacts?${params}`);
      if (res.ok) setContacts(await res.json());
    } catch { } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (userId) loadContacts(userId, search);
    else if (mounted) setLoading(false);
  }, [userId, mounted, loadContacts, search]);

  const handleDelete = async (id: number) => {
    if (!userId) return;
    await fetch(`${api}/addressbook/contacts/${id}?user_id=${userId}`, { method: "DELETE" });
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  // 검색 debounce
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const handleSearch = (v: string) => {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      if (userId) loadContacts(userId, v);
    }, 300);
  };

  if (!mounted) return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <Loader2 className="size-8 animate-spin text-indigo-600" />
    </main>
  );

  if (!userId) return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <p className="text-gray-500 mb-4">로그인이 필요합니다.</p>
        <Link href={routes.oauth.login} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm">로그인</Link>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {showUpload && (
        <UploadModal
          userId={userId}
          onClose={() => setShowUpload(false)}
          onSuccess={() => { loadContacts(userId, search); setShowUpload(false); }}
        />
      )}

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
              <ArrowLeft className="size-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
                <BookUser className="size-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">주소록</h1>
                <p className="text-xs text-gray-400 dark:text-gray-600">{contacts.length}명</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <FileUp className="size-4" />
            등록
          </button>
        </div>

        {/* 검색 */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder="이름 또는 이메일 검색"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
          />
        </div>

        {/* 목록 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-indigo-500" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <BookUser className="size-7 text-gray-400 dark:text-gray-600" />
            </div>
            <p className="font-medium text-gray-600 dark:text-gray-400">
              {search ? "검색 결과가 없습니다" : "주소록이 비어있습니다"}
            </p>
            {!search && (
              <button
                onClick={() => setShowUpload(true)}
                className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Google CSV 업로드하기 →
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {contacts.map(c => (
              <li key={c.id} className="flex items-center gap-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 hover:shadow-sm transition-shadow group">
                <div className="shrink-0 w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
                  <User className="size-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{c.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                      <Mail className="size-3 shrink-0" />{c.email}
                    </span>
                    {c.phone && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-600 shrink-0">
                        <Phone className="size-3" />{c.phone}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="opacity-0 group-hover:opacity-100 shrink-0 text-gray-300 dark:text-gray-700 hover:text-red-500 transition-all"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
