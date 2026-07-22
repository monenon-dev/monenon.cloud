"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { SocialLoginButtons } from "@/components/auth/social-login-buttons";
import Logo from "@/components/brand/Logo";
import { formatApiError } from "@/lib/format-api-error";

import { getApiBaseUrl } from "@/lib/api-base";
import { routes } from "@/lib/routes";

const apiBaseUrl = getApiBaseUrl();
const RESERVED_ADMIN_EMAIL = "admin@gmail.com";

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
    <main className="relative flex min-h-dvh flex-col items-center justify-center moneo-grid-bg px-4 py-10 text-[var(--moneo-text)]">
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Link href="/" aria-label="Moneo home" className="inline-flex">
            <Logo variant="horizontal" theme="dark" size={48} showTagline />
          </Link>
          <p className="text-sm text-indigo-200/60">새 계정 만들기</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#12121a]/90 p-6 shadow-[0_0_40px_rgba(99,102,241,0.1)] backdrop-blur-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            {ui.error && (
              <p
                role="alert"
                className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
              >
                {ui.error}
              </p>
            )}

            <div>
              <label htmlFor="signup-nickname" className={AUTH_LABEL}>
                닉네임
              </label>
              <input
                id="signup-nickname"
                name="nickname"
                type="text"
                autoComplete="nickname"
                required
                maxLength={32}
                className={AUTH_INPUT}
                placeholder="표시 이름"
              />
            </div>

            <div>
              <label htmlFor="signup-email" className={AUTH_LABEL}>
                이메일
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={AUTH_INPUT}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="signup-password" className={AUTH_LABEL}>
                비밀번호
              </label>
              <input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className={AUTH_INPUT}
                placeholder="4자 이상"
              />
              <p className="mt-1 text-xs text-gray-500">4자 이상</p>
            </div>

            <div>
              <label htmlFor="signup-confirm" className={AUTH_LABEL}>
                비밀번호 확인
              </label>
              <input
                id="signup-confirm"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className={AUTH_INPUT}
                placeholder="비밀번호 다시 입력"
              />
            </div>

            <button
              type="submit"
              disabled={ui.loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
            >
              {ui.loading ? <Loader2 className="size-4 animate-spin" /> : null}
              회원가입
            </button>
          </form>

          <SocialDivider />

          <SocialLoginButtons redirectTo={routes.oauth.onboarding} forceRedirect />
        </div>

        <p className="mt-6 text-center text-sm text-indigo-200/55">
          이미 계정이 있으신가요?{" "}
          <Link
            href={routes.oauth.login}
            className="font-medium text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            로그인
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
