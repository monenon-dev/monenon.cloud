"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

import {
  consumeSocialLoginNext,
  getKakaoConsentToken,
  hasKakaoConsent,
  saveSocialLoginNext,
} from "@/lib/social-auth";
import { SITE_NAME } from "@/lib/site-brand";
import { routes } from "@/lib/routes";

/** 카카오 로그인 UI — 약관 동의 토큰이 있을 때만 진입. */
export default function KakaoOauthLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f5f5f5] text-slate-500">
          <p className="text-sm">로딩 중…</p>
        </main>
      }
    >
      <KakaoOauthLoginContent />
    </Suspense>
  );
}

function KakaoOauthLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ui, setUi] = useState({
    ready: false,
    allowed: false,
    saveSimple: false,
    loading: false,
    error: null as string | null,
    info: null as string | null,
    consentToken: null as string | null,
  });

  const patchUi = (patch: Partial<typeof ui>) => setUi((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    const next = searchParams.get("next");
    if (next?.startsWith("/")) saveSocialLoginNext(next);

    const ok = hasKakaoConsent();
    patchUi({
      ready: true,
      allowed: ok,
      consentToken: getKakaoConsentToken(),
    });
    if (!ok) router.replace(routes.oauth.signupKakao);
  }, [router, searchParams]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.currentTarget).entries());
    const id = String(form.login_id ?? "").trim();
    const password = String(form.password ?? "");
    if (!id || !password) {
      patchUi({ error: "아이디와 비밀번호를 입력해 주세요." });
      return;
    }
    patchUi({ loading: true, error: null, info: null });
    const consentToken = getKakaoConsentToken();
    window.setTimeout(() => {
      localStorage.setItem(
        "moneo_kakao_session",
        JSON.stringify({
          provider: "kakao",
          login_id: id,
          consent_token: consentToken,
          save_simple: ui.saveSimple,
          at: new Date().toISOString(),
        })
      );
      const destination = consumeSocialLoginNext("/");
      router.replace(destination);
      router.refresh();
    }, 400);
  };

  if (!ui.ready || !ui.allowed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f5] text-slate-500">
        <p className="text-sm">동의 확인 중…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f5f5f5] px-4 py-10 text-[#191919]">
      <p className="mb-10 text-[28px] font-semibold tracking-tight">kakao</p>

      <div className="w-full max-w-[400px] rounded-xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            name="login_id"
            type="text"
            required
            placeholder="카카오메일 아이디, 이메일, 전화번호"
            autoComplete="username"
            className="w-full border-0 border-b border-slate-200 bg-transparent px-1 py-3 text-[15px] outline-none placeholder:text-slate-400 focus:border-slate-400"
          />
          <input
            name="password"
            type="password"
            required
            placeholder="비밀번호"
            autoComplete="current-password"
            className="w-full border-0 border-b border-slate-200 bg-transparent px-1 py-3 text-[15px] outline-none placeholder:text-slate-400 focus:border-slate-400"
          />

          <label className="flex items-center gap-2 text-[13px] text-slate-600">
            <input
              type="checkbox"
              checked={ui.saveSimple}
              onChange={(e) => patchUi({ saveSimple: e.target.checked })}
              className="size-4 rounded-full border-slate-300"
            />
            간편로그인 정보 저장
            <span
              className="inline-flex size-4 items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-400"
              title="이 기기에서 다음 로그인 시 입력을 줄입니다. (PoC)"
            >
              i
            </span>
          </label>

          {ui.error ? <p className="text-sm text-red-600">{ui.error}</p> : null}
          {ui.info ? <p className="text-sm text-emerald-700">{ui.info}</p> : null}

          <button
            type="submit"
            disabled={ui.loading}
            className="w-full rounded-md bg-[#FEE500] py-3.5 text-[15px] font-bold text-[#191919] hover:brightness-95 disabled:opacity-60"
          >
            {ui.loading ? "로그인 중…" : "로그인"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-[12px] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          또는
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={() => patchUi({ info: "QR코드 로그인 PoC 미연동", error: null })}
          className="w-full rounded-md bg-[#f5f5f5] py-3.5 text-[15px] font-semibold text-[#191919] hover:bg-slate-200"
        >
          QR코드 로그인
        </button>

        <div className="mt-8 flex items-center justify-between text-[12px] text-slate-500">
          <Link href={routes.oauth.signupKakao} className="hover:underline">
            회원가입
          </Link>
          <p>
            <button type="button" className="hover:underline">
              계정 찾기
            </button>
            <span className="mx-1.5 text-slate-300">|</span>
            <button type="button" className="hover:underline">
              비밀번호 찾기
            </button>
          </p>
        </div>
      </div>

      <p className="mt-10 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
        <button type="button">한국어 ▾</button>
        <button type="button">이용약관</button>
        <button type="button" className="font-semibold text-slate-700">
          개인정보 처리방침
        </button>
        <button type="button">고객센터</button>
        <span>© Kakao Corp.</span>
      </p>

      <p className="mt-3 max-w-[400px] truncate text-center font-mono text-[10px] text-slate-400">
        consent: {ui.consentToken}
      </p>
      <p className="mt-2 text-center text-[11px] text-slate-400">
        <Link href={routes.oauth.login} className="hover:underline">
          {SITE_NAME} 로그인으로
        </Link>
      </p>
    </main>
  );
}
