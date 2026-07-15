"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { GoogleAuthSection } from "@/components/auth/google-auth-section";
import { formatApiError } from "@/lib/format-api-error";

import { getApiBaseUrl } from "@/lib/api-base";
import { routes } from "@/lib/routes";

const apiBaseUrl = getApiBaseUrl();
const RESERVED_ADMIN_EMAIL = "admin@gmail.com";

export default function SignupPage() {
  const router = useRouter();
  const [ui, setUi] = useState({
    loading: false,
    error: null as string | null,
  });

  const patchUi = (patch: Partial<typeof ui>) =>
    setUi((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formProps = Object.fromEntries(new FormData(e.currentTarget).entries());
    const nickname = String(formProps.nickname ?? "").trim();
    const email = String(formProps.email ?? "").trim();
    const password = String(formProps.password ?? "");
    const confirmPassword = String(formProps.confirmPassword ?? "");

    if (email.toLowerCase() === RESERVED_ADMIN_EMAIL) {
      patchUi({ error: "이 이메일은 사용할 수 없습니다." });
      return;
    }
    if (password !== confirmPassword) {
      patchUi({ error: "비밀번호가 일치하지 않습니다." });
      return;
    }
    if (password.length < 4) {
      patchUi({ error: "비밀번호는 4자 이상이어야 합니다." });
      return;
    }
    if (!nickname) {
      patchUi({ error: "닉네임을 입력하세요." });
      return;
    }

    patchUi({ loading: true, error: null });
    try {
      const res = await fetch(`${apiBaseUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, email, password }),
      });
      const data: Record<string, unknown> = await res.json().catch(() => ({}));
      if (!res.ok) {
        patchUi({ error: formatApiError(data, "회원가입에 실패했습니다.") });
        return;
      }
      const emailParam = encodeURIComponent(email);
      router.push(`${routes.oauth.login}?registered=1&email=${emailParam}`);
    } catch {
      patchUi({ error: "네트워크 오류가 발생했습니다." });
    } finally {
      patchUi({ loading: false });
    }
  };

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            Moneo
          </Link>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">새 계정 만들기</p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/40 p-6 shadow-sm">
          <GoogleAuthSection redirectTo="/" />

          <form onSubmit={handleSubmit} className="space-y-4">
          {ui.error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
              {ui.error}
            </p>
          )}

          <div>
            <label htmlFor="signup-nickname" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              닉네임
            </label>
            <input
              id="signup-nickname"
              name="nickname"
              type="text"
              autoComplete="nickname"
              required
              maxLength={32}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
              placeholder="표시 이름"
            />
          </div>

          <div>
            <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              이메일
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              비밀번호
            </label>
            <input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
            />
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">4자 이상</p>
          </div>

          <div>
            <label htmlFor="signup-confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              비밀번호 확인
            </label>
            <input
              id="signup-confirm"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={ui.loading}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {ui.loading ? <Loader2 className="animate-spin size-4" /> : null}
            회원가입
          </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
          이미 계정이 있으신가요?{" "}
          <Link href={routes.oauth.login} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
            로그인
          </Link>
        </p>

        <p className="text-center mt-4">
          <Link href="/" className="text-sm text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300">
            ← 홈으로
          </Link>
        </p>
      </div>
    </main>
  );
}
