"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";

import { AdminSidebarLayout } from "@/components/admin/admin-sidebar-layout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type AdminUserSettingRow,
  fetchAdminUserSettings,
} from "@/lib/admin-api";
import { clearAdminSession, getAdminNickname, isSessionAdmin } from "@/lib/session-user";
import { routes } from "@/lib/routes";

const LANGUAGE_LABEL: Record<string, string> = {
  ko: "한국어",
  en: "English",
  ja: "日本語",
};

function formatLanguage(code: string | null): string {
  if (!code) return "—";
  return LANGUAGE_LABEL[code] ?? code;
}

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminUserSettingsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [rows, setRows] = useState<AdminUserSettingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<AdminUserSettingRow | null>(null);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (row) =>
        row.nickname.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        String(row.user_id).includes(q)
    );
  }, [rows, searchQuery]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isSessionAdmin()) {
      router.replace(`${routes.oauth.admin.login}?reason=not_admin`);
    }
  }, [mounted, router]);

  const load = useCallback(async () => {
    if (!isSessionAdmin()) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchAdminUserSettings());
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted && isSessionAdmin()) {
      void load();
    }
  }, [mounted, load]);

  if (!mounted || !isSessionAdmin()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="size-8 animate-spin text-violet-600" aria-label="불러오는 중" />
      </main>
    );
  }

  return (
    <AdminSidebarLayout
      activeSection="user_settings"
      adminNickname={getAdminNickname()}
      onLogout={() => {
        clearAdminSession();
        router.replace(routes.oauth.admin.login);
      }}
      headerActions={
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-900"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          새로고침
        </button>
      }
    >
        <div className="mb-4 flex justify-end">
          <label className="relative block w-full sm:max-w-xs">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              aria-hidden
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="닉네임·이메일·ID 검색"
              className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-950"
            />
          </label>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {loading ? "불러오는 중…" : `${filteredRows.length}명`}
              {searchQuery.trim() && !loading ? ` (전체 ${rows.length}명)` : null}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-950/80">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">닉네임</th>
                  <th className="px-4 py-3 font-semibold">이메일</th>
                  <th className="px-4 py-3 font-semibold">언어</th>
                  <th className="px-4 py-3 font-semibold">AI 모델</th>
                  <th className="px-4 py-3 font-semibold">상태</th>
                  <th className="px-4 py-3 font-semibold">수정 시각</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {!loading && filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      {searchQuery.trim() ? "검색 결과가 없습니다." : "표시할 회원이 없습니다."}
                    </td>
                  </tr>
                )}
                {filteredRows.map((row) => (
                  <tr
                    key={row.user_id}
                    className="cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-950/40"
                    onClick={() => setSelected(row)}
                  >
                    <td className="px-4 py-3 font-mono tabular-nums text-gray-500">{row.user_id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {row.nickname}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{row.email}</td>
                    <td className="px-4 py-3">{formatLanguage(row.language)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                      {row.preferred_model ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          row.has_settings
                            ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {row.has_settings ? "설정 있음" : "미설정"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDateTime(row.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>설정 상세</DialogTitle>
            <DialogDescription>
              {selected ? `${selected.nickname} · ${selected.email}` : ""}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <dl className="mt-2 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">회원 ID</dt>
                <dd className="font-mono text-gray-900 dark:text-white">{selected.user_id}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">언어</dt>
                <dd className="text-gray-900 dark:text-white">
                  {formatLanguage(selected.language)}
                  {selected.language ? ` (${selected.language})` : ""}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">선호 AI 모델</dt>
                <dd className="max-w-[14rem] break-all text-right font-mono text-xs text-gray-900 dark:text-white">
                  {selected.preferred_model ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">설정 상태</dt>
                <dd className="text-gray-900 dark:text-white">
                  {selected.has_settings ? "user_settings 행 존재" : "아직 저장된 설정 없음"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">마지막 수정</dt>
                <dd className="text-gray-900 dark:text-white">
                  {formatDateTime(selected.updated_at)}
                </dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </AdminSidebarLayout>
  );
}
