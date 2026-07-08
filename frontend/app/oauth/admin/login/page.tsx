"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Shield } from "lucide-react";

import { loginAsAdmin } from "@/lib/auth-api";
import { isSessionAdmin, saveAdminSession } from "@/lib/session-user";
import { routes } from "@/lib/routes";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reason = searchParams.get("reason");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && isSessionAdmin()) {
      router.replace(routes.oauth.admin.root);
    }
  }, [mounted, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formProps = Object.fromEntries(new FormData(e.currentTarget).entries());
    const email = String(formProps.email ?? "").trim();
    const password = String(formProps.password ?? "");

    setLoading(true);
    setError(null);
    try {
      const session = await loginAsAdmin(email, password);
      saveAdminSession(session.access_token, session.email, session.nickname);
      router.push(routes.oauth.admin.root);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="size-8 animate-spin text-violet-600" aria-label="불러오는 중" />
      </main>
    );
  }

  if (isSessionAdmin()) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="size-8 animate-spin text-violet-600" aria-label="이동 중" />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-10 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
            <Shield size={28} aria-hidden />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">관리자 로그인</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            지정된 관리자 계정으로만 접속할 수 있습니다.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          {reason === "not_admin" && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              관리자 로그인이 필요합니다.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
            >
              {error}
            </p>
          )}

          <div>
            <label
              htmlFor="admin-login-email"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              관리자 이메일
            </label>
            <input
              id="admin-login-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-violet-500 dark:border-gray-700 dark:bg-gray-950"
              placeholder="admin@gmail.com"
            />
          </div>

          <div>
            <label
              htmlFor="admin-login-password"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              비밀번호
            </label>
            <input
              id="admin-login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-violet-500 dark:border-gray-700 dark:bg-gray-950"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            관리자 로그인
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          일반 회원가입·로그인은{" "}
          <Link href={routes.oauth.signup} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            회원가입
          </Link>
          {" · "}
          <Link href={routes.oauth.login} className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            로그인
          </Link>
          에서 진행하세요.
        </p>

        <p className="mt-4 text-center">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-gray-800 dark:text-gray-500 dark:hover:text-gray-300"
          >
            ← 홈으로
          </Link>
        </p>
      </div>
    </main>
  );
}

function AdminLoginFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <Loader2 className="size-8 animate-spin text-violet-600" aria-label="로딩 중" />
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AdminLoginFallback />}>
      <AdminLoginForm />
    </Suspense>
  );
}
