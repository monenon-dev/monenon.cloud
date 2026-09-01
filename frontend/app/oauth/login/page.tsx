"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { SocialLoginButtons } from "@/components/auth/social-login-buttons";
import Logo from "@/components/brand/Logo";
import { loginWithCredentials, saveAuthSession } from "@/lib/auth-api";
import { resolvePostAuthRedirect } from "@/lib/mypage-preferences";
import { formatOAuthError } from "@/lib/oauth-errors";
import { routes } from "@/lib/routes";

const AUTH_LABEL = "mb-1.5 block text-sm font-medium text-gray-300";
const AUTH_INPUT =
  "w-full rounded-xl border border-white/10 bg-[#0e0e14] px-3 py-2.5 text-sm text-indigo-50 outline-none placeholder:text-gray-500 focus:border-indigo-500/40 focus:ring-2 focus:ring-indigo-500/50";

function SocialDivider() {
  return (
    <div className="relative my-5 flex items-center gap-3" role="separator">
      <div
        className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent"
        aria-hidden
      />
      <span className="shrink-0 text-xs tracking-wide text-gray-500">
        또는 소셜 계정으로
      </span>
      <div
        className="h-px flex-1 bg-gradient-to-r from-transparent via-white/15 to-transparent"
        aria-hidden
      />
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ui, setUi] = useState({
    loading: false,
    error: null as string | null,
  });

  const patchUi = (patch: Partial<typeof ui>) =>
    setUi((prev) => ({ ...prev, ...patch }));

  const prefillEmail = searchParams.get("email");
  const formKey = prefillEmail ?? "default";
  const redirectTo = searchParams.get("next") || "/";
  const oauthError = formatOAuthError(searchParams.get("error"));
  const successMessage =
    searchParams.get("registered") === "1"
      ? "회원가입이 완료되었습니다. 로그인한 뒤 업무 상황을 설정해 주세요."
      : null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formProps = Object.fromEntries(new FormData(e.currentTarget).entries());
    const email = String(formProps.email ?? "").trim();
    const password = String(formProps.password ?? "");

    patchUi({ loading: true, error: null });
    try {
      const session = await loginWithCredentials(email, password);
      saveAuthSession({ ...session, provider: "credentials" });
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
    <main className="relative flex min-h-dvh flex-col items-center justify-center moneo-grid-bg px-4 py-10 text-[var(--moneo-text)]">
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Link href="/" aria-label="Moneo home" className="inline-flex">
            <Logo variant="horizontal" theme="dark" size={48} showTagline />
          </Link>
          <p className="text-sm text-indigo-200/60">계정으로 로그인</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#12121a]/90 p-6 shadow-[0_0_40px_rgba(99,102,241,0.1)] backdrop-blur-md">
          <form key={formKey} onSubmit={handleSubmit} className="space-y-4">
            {successMessage && (
              <p className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {successMessage}
              </p>
            )}
            {oauthError && (
              <p
                role="alert"
                className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
              >
                {oauthError}
              </p>
            )}
            {ui.error && (
              <p
                role="alert"
                className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
              >
                {ui.error}
              </p>
            )}

            <div>
              <label htmlFor="login-email" className={AUTH_LABEL}>
                이메일
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                defaultValue={
                  prefillEmail ? decodeURIComponent(prefillEmail) : undefined
                }
                className={AUTH_INPUT}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="login-password" className={AUTH_LABEL}>
                비밀번호
              </label>
              <input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={AUTH_INPUT}
                placeholder="비밀번호"
              />
            </div>

            <button
              type="submit"
              disabled={ui.loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
            >
              {ui.loading ? <Loader2 className="size-4 animate-spin" /> : null}
              로그인
            </button>
          </form>

          <SocialDivider />

          <SocialLoginButtons redirectTo={redirectTo} />
        </div>

        <p className="mt-6 text-center text-sm text-indigo-200/55">
          계정이 없으신가요?{" "}
          <Link
            href={routes.oauth.signup}
            className="font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            회원가입
          </Link>
        </p>

        <p className="mt-4 text-center">
          <Link
            href="/"
            className="text-sm text-gray-500 hover:text-indigo-200/80"
          >
            ← 홈으로
          </Link>
        </p>
      </div>
    </main>
  );
}

function LoginFallback() {
  return (
    <main className="flex min-h-dvh items-center justify-center moneo-grid-bg">
      <Loader2 className="size-8 animate-spin text-indigo-400" aria-label="로딩 중" />
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
