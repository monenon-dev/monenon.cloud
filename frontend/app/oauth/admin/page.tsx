"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Unlock,
  UserPlus,
  Users,
} from "lucide-react";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdminSidebarLayout } from "@/components/admin/admin-sidebar-layout";
import {
  type AdminUser,
  type AdminUserFilter,
  createAdminMember,
  fetchAdminUsers,
  sendAdminWarning,
  unsuspendAdminMember,
  withdrawAdminMember,
} from "@/lib/admin-api";
import { clearAdminSession, getAdminNickname, isSessionAdmin } from "@/lib/session-user";
import { routes } from "@/lib/routes";

const FILTER_TABS: { key: AdminUserFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "admins", label: "관리자" },
  { key: "members", label: "일반 사용자" },
];

const ROLE_LABEL: Record<string, string> = {
  admin: "관리자",
  user: "일반",
};

const WARNING_PRESETS = [
  "비매너 행위가 확인되었습니다.",
  "이용 규칙 위반이 확인되었습니다.",
  "스팸성 활동이 확인되었습니다.",
] as const;

type SuspendDays = 1 | 3 | 5;

const SUSPEND_DAY_OPTIONS: { days: SuspendDays; label: string }[] = [
  { days: 1, label: "1일" },
  { days: 3, label: "3일" },
  { days: 5, label: "5일" },
];

type ConfirmState =
  | { type: "withdraw"; user: AdminUser }
  | { type: "warning"; user: AdminUser; message: string; suspendDays: SuspendDays }
  | { type: "unsuspend"; user: AdminUser };

export default function AdminPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<AdminUserFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [warningModalUser, setWarningModalUser] = useState<AdminUser | null>(null);
  const [warningMessage, setWarningMessage] = useState("");
  const [suspendDays, setSuspendDays] = useState<SuspendDays>(1);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (user) =>
        user.nickname.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)
    );
  }, [searchQuery, users]);

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
      const rows = await fetchAdminUsers(filter);
      setUsers(
        rows.map((user) => ({
          ...user,
          warning_count: user.warning_count ?? 0,
          is_suspended: user.is_suspended ?? false,
          suspended_until: user.suspended_until ?? null,
        }))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (mounted && isSessionAdmin()) {
      load();
    }
  }, [mounted, load]);

  const openWarningModal = (user: AdminUser) => {
    setWarningModalUser(user);
    setWarningMessage("");
    setSuspendDays(1);
    setActionError(null);
  };

  const closeWarningModal = () => {
    setWarningModalUser(null);
    setWarningMessage("");
    setSuspendDays(1);
    setActionError(null);
  };

  const requestWithdrawConfirm = (user: AdminUser) => {
    setActionError(null);
    setConfirm({ type: "withdraw", user });
  };

  const requestWarningConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!warningModalUser) return;
    const message = warningMessage.trim();
    if (!message) {
      setActionError("경고 사유를 입력해 주세요.");
      return;
    }
    setActionError(null);
    setConfirm({
      type: "warning",
      user: warningModalUser,
      message,
      suspendDays: warningModalUser.warning_count >= 2 ? suspendDays : 1,
    });
  };

  const requestUnsuspendConfirm = (user: AdminUser) => {
    setActionError(null);
    setConfirm({ type: "unsuspend", user });
  };

  const executeConfirm = async () => {
    if (!confirm) return;
    setActionBusy(true);
    setActionError(null);
    setSuccessMessage(null);
    try {
      if (confirm.type === "withdraw") {
        await withdrawAdminMember(confirm.user.id);
        setSuccessMessage(`「${confirm.user.nickname}」님을 탈퇴 처리했습니다.`);
        closeWarningModal();
      } else if (confirm.type === "warning") {
        const result = await sendAdminWarning(
          confirm.user.id,
          confirm.message,
          confirm.user.warning_count >= 2 ? confirm.suspendDays : undefined
        );
        if (result.suspended) {
          setSuccessMessage(
            `「${confirm.user.nickname}」님에게 경고를 전송했고, 누적 ${result.warning_count}회로 계정을 ${confirm.suspendDays}일간 일시정지했습니다.`
          );
        } else {
          setSuccessMessage(`「${confirm.user.nickname}」님에게 경고를 전송했습니다.`);
        }
        closeWarningModal();
      } else {
        await unsuspendAdminMember(confirm.user.id);
        setSuccessMessage(`「${confirm.user.nickname}」님의 계정 일시정지를 해제했습니다.`);
      }
      setConfirm(null);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "처리에 실패했습니다.");
      setConfirm(null);
    } finally {
      setActionBusy(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await createAdminMember({ nickname, email, password, role: "user" });
      setNickname("");
      setEmail("");
      setPassword("");
      setShowForm(false);
      setSuccessMessage("새 사용자 계정을 생성했습니다.");
      await load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "생성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted || !isSessionAdmin()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="size-8 animate-spin text-violet-600" aria-label="불러오는 중" />
      </main>
    );
  }

  return (
    <AdminSidebarLayout
      activeSection="members"
      adminNickname={getAdminNickname()}
      onLogout={() => {
        clearAdminSession();
        router.replace(routes.oauth.admin.login);
      }}
      headerActions={
        <>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-900"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            새로고침
          </button>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <UserPlus size={14} />
            계정 추가
          </button>
        </>
      }
    >
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">새 일반 사용자</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">닉네임</span>
                <input
                  required
                  maxLength={32}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">이메일</span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">비밀번호</span>
                <input
                  required
                  type="password"
                  minLength={1}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
                />
              </label>
            </div>
            {formError && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{formError}</p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? "생성 중…" : "생성"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
              >
                취소
              </button>
            </div>
          </form>
        )}

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === tab.key
                    ? "bg-indigo-600 text-white"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
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
              placeholder="닉네임·이메일 검색"
              className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm dark:border-gray-700 dark:bg-gray-950"
            />
          </label>
        </div>

        {successMessage && (
          <p className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
            {successMessage}
          </p>
        )}

        {error && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}

        {actionError && !warningModalUser && (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {actionError}
          </p>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              <Users size={16} aria-hidden />
              {loading ? "불러오는 중…" : `${filteredUsers.length}명`}
              {searchQuery.trim() && !loading ? ` (전체 ${users.length}명)` : null}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-950/80">
                <tr>
                  <th className="px-4 py-3 font-semibold">ID</th>
                  <th className="px-4 py-3 font-semibold">닉네임</th>
                  <th className="px-4 py-3 font-semibold">이메일</th>
                  <th className="px-4 py-3 font-semibold">역할</th>
                  <th className="px-4 py-3 font-semibold text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {!loading && filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      {searchQuery.trim()
                        ? "검색 결과가 없습니다."
                        : "표시할 사용자가 없습니다."}
                    </td>
                  </tr>
                )}
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-950/40">
                    <td className="px-4 py-3 font-mono tabular-nums text-gray-500">{user.id}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      <div className="flex flex-col gap-1">
                        <span>{user.nickname}</span>
                        {user.is_suspended && (
                          <span className="inline-flex w-fit rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800 dark:bg-red-950 dark:text-red-200">
                            일시정지
                            {user.suspended_until
                              ? ` · ${new Date(user.suspended_until).toLocaleString("ko-KR")}까지`
                              : ""}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{user.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          user.role === "admin"
                            ? "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                        }`}
                      >
                        {ROLE_LABEL[user.role] ?? user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {user.role === "user" ? (
                        <div className="inline-flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => openWarningModal(user)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100 dark:hover:bg-amber-950"
                          >
                            <AlertTriangle size={12} aria-hidden />
                            경고
                            {user.warning_count > 0 && (
                              <span className="inline-flex min-w-[1.125rem] items-center justify-center rounded-full bg-amber-600 px-1 text-[10px] font-bold text-white">
                                {user.warning_count}
                              </span>
                            )}
                          </button>
                          {user.is_suspended && (
                            <button
                              type="button"
                              disabled={actionBusy}
                              onClick={() => requestUnsuspendConfirm(user)}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100"
                            >
                              <Unlock size={12} aria-hidden />
                              정지 해제
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={actionBusy}
                            onClick={() => requestWithdrawConfirm(user)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-950"
                          >
                            <Trash2 size={12} aria-hidden />
                            탈퇴
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      <Dialog
        open={warningModalUser !== null}
        onOpenChange={(open) => {
          if (!open) closeWarningModal();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={requestWarningConfirm}>
            <DialogHeader>
              <DialogTitle>경고 보내기</DialogTitle>
              <DialogDescription>
                {warningModalUser
                  ? `${warningModalUser.nickname} · ${warningModalUser.email}`
                  : ""}
                {warningModalUser && warningModalUser.warning_count > 0
                  ? ` · 누적 경고 ${warningModalUser.warning_count}회`
                  : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4">
              <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                사유 선택 (빠른 입력)
              </p>
              <div className="flex flex-wrap gap-2">
                {WARNING_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setWarningMessage(preset)}
                    className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 hover:border-amber-300 hover:bg-amber-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
                  >
                    {preset.replace("가 확인되었습니다.", "")}
                  </button>
                ))}
              </div>
            </div>

            {warningModalUser && warningModalUser.warning_count >= 2 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  일시정지 기간 (누적 3회 이상 시 적용)
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUSPEND_DAY_OPTIONS.map((option) => (
                    <button
                      key={option.days}
                      type="button"
                      onClick={() => setSuspendDays(option.days)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium ${
                        suspendDays === option.days
                          ? "border-red-500 bg-red-600 text-white"
                          : "border-gray-200 bg-gray-50 text-gray-700 hover:border-red-300 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="mt-4 block text-sm">
              <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                경고 사유
              </span>
              <textarea
                required
                rows={4}
                maxLength={2000}
                value={warningMessage}
                onChange={(e) => setWarningMessage(e.target.value)}
                placeholder="예: 이용 규칙 위반이 확인되어 경고합니다."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
              />
            </label>

            {actionError && warningModalUser && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{actionError}</p>
            )}

            <DialogFooter className="mt-4">
              <button
                type="button"
                onClick={closeWarningModal}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm dark:border-gray-700"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={actionBusy || !warningMessage.trim()}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                경고 전송
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !actionBusy) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.type === "withdraw"
                ? "탈퇴 확인"
                : confirm?.type === "unsuspend"
                  ? "정지 해제 확인"
                  : "경고 전송 확인"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.type === "withdraw" ? (
                <>
                  「{confirm.user.nickname}」({confirm.user.email}) 계정을 탈퇴 처리할까요?
                  <br />
                  관련 데이터(옷장·채팅 등)가 함께 삭제됩니다.
                </>
              ) : confirm?.type === "unsuspend" ? (
                <>
                  「{confirm.user.nickname}」({confirm.user.email}) 계정의 일시정지를 해제할까요?
                </>
              ) : confirm?.type === "warning" ? (
                <>
                  「{confirm.user.nickname}」님에게 아래 내용으로 경고를 전송할까요?
                  {confirm.user.warning_count >= 2 && (
                    <>
                      <br />
                      누적 3회 이상이면 {confirm.suspendDays}일간 일시정지됩니다.
                    </>
                  )}
                  <span className="mt-2 block rounded-lg bg-gray-100 px-3 py-2 text-left text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                    {confirm.message}
                  </span>
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionBusy}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionBusy}
              onClick={(e) => {
                e.preventDefault();
                void executeConfirm();
              }}
              className={
                confirm?.type === "withdraw"
                  ? "bg-red-600 hover:bg-red-700"
                  : confirm?.type === "unsuspend"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-amber-600 hover:bg-amber-700"
              }
            >
              {actionBusy
                ? "처리 중…"
                : confirm?.type === "withdraw"
                  ? "탈퇴 처리"
                  : confirm?.type === "unsuspend"
                    ? "정지 해제"
                    : "경고 전송"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminSidebarLayout>
  );
}
