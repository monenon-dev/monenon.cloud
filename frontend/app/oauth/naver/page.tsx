"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

import {
  consumeSocialLoginNext,
  getNaverConsentToken,
  hasNaverConsent,
  saveSocialLoginNext,
  saveSocialProviderSession,
} from "@/lib/social-auth";
import { SITE_NAME } from "@/lib/site-brand";
import { routes } from "@/lib/routes";

/**
 * 네이버 OAuth 로그인 UI (다크) — 약관 동의 토큰이 있을 때만 진입.
 * 실제 nid.naver.com 대신 로컬 화면으로 흐름을 재현한다.
 */
export default function NaverOauthLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#1a1a1a] text-slate-300">
          <p className="text-sm">로딩 중…</p>
        </main>
      }
    >
      <NaverOauthLoginContent />
    </Suspense>
  );
}

function NaverOauthLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ui, setUi] = useState({
    ready: false,
    allowed: false,
    keepLogin: false,
    ipSecure: true,
    loading: false,
    error: null as string | null,
    info: null as string | null,
    consentToken: null as string | null,
  });

  const patchUi = (patch: Partial<typeof ui>) => setUi((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    const next = searchParams.get("next");
    if (next?.startsWith("/")) saveSocialLoginNext(next);

    const ok = hasNaverConsent();
    patchUi({
      ready: true,
      allowed: ok,
      consentToken: getNaverConsentToken(),
    });
    if (!ok) {
      router.replace(routes.oauth.signupNaver);
    }
  }, [router, searchParams]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget).entries());
    const id = String(form.login_id ?? "").trim();
    const password = String(form.password ?? "");
    if (!id || !password) {
      patchUi({ error: "아이디(또는 전화번호)와 비밀번호를 입력해 주세요." });
      return;
    }
    patchUi({ loading: true, error: null, info: null });
    const consentToken = getNaverConsentToken();
    window.setTimeout(() => {
      if (ui.keepLogin) {
        saveSocialProviderSession("naver", {
          login_id: id,
          consent_token: consentToken,
        });
      }
      const destination = consumeSocialLoginNext("/");
      router.replace(destination);
      router.refresh();
    }, 400);
  };

  if (!ui.ready || !ui.allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#1a1a1a] text-slate-300">
        <p className="text-sm">동의 확인 중…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#1a1a1a] px-4 py-10 text-white">
      <div className="w-full max-w-[400px]">
        <div className="mb-10 text-center">
          <p className="text-[40px] font-black tracking-tight text-[#03C75A]">NAVER</p>
          <p className="mt-3 text-[15px] text-slate-300">
            <span className="font-semibold text-white">{SITE_NAME}</span> 로그인 중
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <label className="block">
            <span className="sr-only">아이디 또는 전화번호</span>
            <input
              name="login_id"
              type="text"
              required
              placeholder="아이디 또는 전화번호"
              autoComplete="username"
              className="w-full border-0 border-b-2 border-[#03C75A] bg-transparent px-1 py-3 text-[15px] text-white outline-none placeholder:text-slate-500"
            />
          </label>
          <label className="block">
            <span className="sr-only">비밀번호</span>
            <input
              name="password"
              type="password"
              required
              placeholder="비밀번호"
              autoComplete="current-password"
              className="w-full border-0 border-b border-slate-600 bg-transparent px-1 py-3 text-[15px] text-white outline-none placeholder:text-slate-500 focus:border-slate-400"
            />
          </label>

          <div className="flex items-center justify-between pt-1 text-[13px] text-slate-300">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={ui.keepLogin}
                onChange={(e) => patchUi({ keepLogin: e.target.checked })}
                className="size-4 rounded border-slate-500"
              />
              로그인 상태 유지
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <span>IP 보안</span>
              <button
                type="button"
                role="switch"
                aria-checked={ui.ipSecure}
                onClick={() => patchUi({ ipSecure: !ui.ipSecure })}
                className={[
                  "relative h-5 w-10 rounded-full transition-colors",
                  ui.ipSecure ? "bg-[#03C75A]" : "bg-slate-600",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-0.5 size-4 rounded-full bg-white transition-transform",
                    ui.ipSecure ? "left-5" : "left-0.5",
                  ].join(" ")}
                />
              </button>
            </label>
          </div>

          {ui.error ? <p className="text-sm text-red-400">{ui.error}</p> : null}
          {ui.info ? <p className="text-sm text-emerald-400">{ui.info}</p> : null}

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() =>
                patchUi({ info: "패스키 로그인은 PoC에서 시뮬레이션만 제공합니다.", error: null })
              }
              className="flex items-center justify-center gap-2 rounded-md bg-[#2a2a2a] py-3.5 text-[14px] font-semibold text-white hover:bg-[#333]"
            >
              <span aria-hidden>🔑</span>
              패스키 로그인
            </button>
            <button
              type="submit"
              disabled={ui.loading}
              className="rounded-md bg-[#03C75A] py-3.5 text-[15px] font-bold text-white hover:brightness-95 disabled:opacity-60"
            >
              {ui.loading ? "로그인 중…" : "로그인"}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-[13px] text-slate-400">
          <button
            type="button"
            className="hover:text-white"
            onClick={() => patchUi({ info: "QR코드 로그인 PoC 미연동", error: null })}
          >
            QR코드로그인 &gt;
          </button>
        </p>

        <p className="mt-8 text-center text-[12px] text-slate-500">
          <button type="button" className="hover:text-slate-300">
            아이디 찾기
          </button>
          <span className="mx-2 text-slate-700">|</span>
          <button type="button" className="hover:text-slate-300">
            비밀번호 찾기
          </button>
          <span className="mx-2 text-slate-700">|</span>
          <Link href={routes.oauth.signupNaver} className="font-semibold text-[#03C75A] hover:underline">
            회원가입
          </Link>
        </p>

        <div className="mt-8 overflow-hidden rounded-md bg-[#1e3a5f] px-4 py-3 text-center text-[13px] text-sky-100">
          N+ Store 혜택 배너 (데모)
        </div>

        <p className="mt-10 text-center text-[11px] text-slate-600">
          <span className="hover:underline">고객센터</span>
          <span className="mx-2">|</span>
          <span>한국어</span>
        </p>
        <p className="mt-2 text-center text-[11px] text-slate-600">© NAVER Corp. · monenon.cloud PoC</p>

        <p className="mt-4 truncate text-center font-mono text-[10px] text-slate-700">
          consent: {ui.consentToken}
        </p>
      </div>
    </main>
  );
}
