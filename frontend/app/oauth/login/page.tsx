"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { GoogleAuthSection } from "@/components/auth/google-auth-section";
import { SocialLoginButtons } from "@/components/auth/social-login-buttons";
import Logo from "@/components/brand/Logo";
import { loginWithCredentials, saveAuthSession } from "@/lib/auth-api";
import { resolvePostAuthRedirect } from "@/lib/mypage-preferences";
import { routes } from "@/lib/routes";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ui, setUi] = useState({
    loading: false,
    error: null as string | null,
    info: null as string | null,
  });

  const patchUi = (patch: Partial<typeof ui>) =>
    setUi((prev) => ({ ...prev, ...patch }));

  const prefillEmail = searchParams.get("email");
  const formKey = prefillEmail ?? "default";
  const redirectTo = searchParams.get("next") || "/";
  const successMessage =
    searchParams.get("registered") === "1"
      ? "회원가입이 완료되었습니다. 로그인한 뒤 업무 상황을 설정해 주세요."
      : null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formProps = Object.fromEntries(new FormData(e.currentTarget).entries());
    const email = String(formProps.email ?? "").trim();
    const password = String(formProps.password ?? "");

    patchUi({ loading: true, error: null, info: null });
    try {
      const session = await loginWithCredentials(email, password);
      saveAuthSession(session);
      const intended = searchParams.get("next") || "/";
      router.push(resolvePostAuthRedirect(session.user_id, intended));
      router.refresh();
    } catch (err) {
      patchUi({
        error: err instanceof Error ? err.message : "로그인에 실패했습니다.",
      });
    } finally {
      patchUi({ loading: false });
    }
  };

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 flex flex-col items-center gap-3">
          <Link href="/" aria-label="Moneo home" className="inline-flex">
            <Logo variant="horizontal" theme="dark" size={48} showTagline />
          </Link>
          <p className="text-sm text-gray-600 dark:text-gray-400">계정으로 로그인</p>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/40 p-6 shadow-sm">
          <GoogleAuthSection redirectTo={redirectTo} />

          <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
          {successMessage && (
            <p className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-900 rounded-lg px-3 py-2">
              {successMessage}
            </p>
          )}
          {ui.info && (
            <p className="text-sm text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 rounded-lg px-3 py-2">
              {ui.info}
            </p>
          )}
          {ui.error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg px-3 py-2">
              {ui.error}
            </p>
          )}

          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              이메일
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              defaultValue={prefillEmail ? decodeURIComponent(prefillEmail) : undefined}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              비밀번호
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
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
            로그인
          </button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wide">
              <span className="bg-gray-50/80 dark:bg-gray-900/40 px-2 text-gray-500 dark:text-gray-400">
                또는 소셜 계정으로
              </span>
            </div>
          </div>

          <SocialLoginButtons onInfo={(message) => patchUi({ info: message, error: null })} />
        </div>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6">
          계정이 없으신가요?{" "}
          <Link href={routes.oauth.signup} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
            회원가입
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

function LoginFallback() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
      <Loader2 className="animate-spin size-8 text-indigo-600" aria-label="로딩 중" />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
