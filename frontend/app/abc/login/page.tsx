"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { abcLoginWithPassword, getAbcApiBaseUrl, hasKakaoConsent, hasNaverConsent, type AbcUserType } from "@/lib/abc-api";

const TABS: { id: AbcUserType; label: string }[] = [
  { id: "general", label: "일반" },
  { id: "biz", label: "기업" },
  { id: "work", label: "업무" },
];

const SOCIAL = [
  {
    id: "naver",
    label: "네이버 아이디로 로그인",
    className: "bg-[#03C75A] text-white hover:brightness-95",
    mark: "N",
    markClass: "bg-white text-[#03C75A]",
  },
  {
    id: "kakao",
    label: "카카오계정으로 로그인",
    className: "bg-[#FEE500] text-[#391B1B] hover:brightness-95",
    mark: "톡",
    markClass: "bg-[#391B1B] text-[#FEE500]",
  },
  {
    id: "google",
    label: "Sign up with Google",
    className: "bg-[#4285F4] text-white hover:brightness-95",
    mark: "G",
    markClass: "bg-white text-[#4285F4]",
  },
  {
    id: "apple",
    label: "Apple로 로그인",
    className: "bg-black text-white hover:bg-neutral-800",
    mark: "",
    markClass: "bg-white text-black",
    apple: true,
  },
  {
    id: "instagram",
    label: "Instagram으로 로그인",
    className:
      "bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] text-white hover:brightness-95",
    mark: "IG",
    markClass: "bg-white/20 text-white",
  },
] as const;

export default function AbcLoginPage() {
  const router = useRouter();
  const [ui, setUi] = useState({
    tab: "general" as AbcUserType,
    loading: false,
    error: null as string | null,
    info: null as string | null,
    savedUsername: "",
    ready: false,
  });

  const patchUi = (patch: Partial<typeof ui>) => setUi((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    const saved = localStorage.getItem("abc_saved_username") ?? "";
    patchUi({ savedUsername: saved, ready: true });
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formProps = Object.fromEntries(new FormData(e.currentTarget).entries());
    const username = String(formProps.username ?? "").trim();
    const password = String(formProps.password ?? "");
    const saveId = formProps.save_id === "on";

    if (!username || !password) {
      patchUi({ error: "아이디와 비밀번호를 입력해 주세요.", info: null });
      return;
    }

    if (saveId && typeof window !== "undefined") {
      localStorage.setItem("abc_saved_username", username);
    } else if (typeof window !== "undefined") {
      localStorage.removeItem("abc_saved_username");
    }

    patchUi({ loading: true, error: null, info: null });
    try {
      const result = await abcLoginWithPassword({
        username,
        password,
        userType: ui.tab,
      });
      patchUi({
        info: result.access_token
          ? "로그인 성공 (토큰 수신)."
          : "로그인 응답 OK. 서버 응답에 access_token이 없습니다.",
      });
    } catch (err) {
      patchUi({
        error: err instanceof Error ? err.message : "로그인에 실패했습니다.",
      });
    } finally {
      patchUi({ loading: false });
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-12 text-slate-900">
      <div className="w-full max-w-[360px]">
        <div className="mb-8 text-center">
          <Link href="/abc" className="inline-block text-[28px] font-bold tracking-tight">
            <span className="text-[#e11d48]">a</span>
            <span className="bg-gradient-to-r from-sky-400 to-blue-700 bg-clip-text text-transparent">
              bc.com
            </span>
          </Link>
        </div>

        <div className="mb-3 grid grid-cols-3 overflow-hidden rounded-sm border border-slate-200">
          {TABS.map((tab) => {
            const active = ui.tab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => patchUi({ tab: tab.id, error: null, info: null })}
                className={[
                  "py-2.5 text-sm font-semibold",
                  active ? "bg-[#1e3a8a] text-white" : "bg-slate-100 text-slate-800 hover:bg-slate-200",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          {ui.ready ? (
            <input
              key={ui.savedUsername || "empty"}
              name="username"
              type="text"
              required
              defaultValue={ui.savedUsername}
              placeholder="아이디"
              autoComplete="username"
              className="w-full rounded-sm border border-slate-300 px-3 py-3 text-sm outline-none focus:border-[#1e3a8a]"
            />
          ) : (
            <input
              name="username"
              type="text"
              required
              placeholder="아이디"
              autoComplete="username"
              className="w-full rounded-sm border border-slate-300 px-3 py-3 text-sm outline-none focus:border-[#1e3a8a]"
            />
          )}
          <input
            name="password"
            type="password"
            required
            placeholder="비밀번호"
            autoComplete="current-password"
            className="w-full rounded-sm border border-slate-300 px-3 py-3 text-sm outline-none focus:border-[#1e3a8a]"
          />

          <label className="flex items-center gap-2 py-1 text-sm text-slate-700">
            <input
              name="save_id"
              type="checkbox"
              defaultChecked={Boolean(ui.savedUsername)}
              className="size-4 rounded border-slate-300"
            />
            아이디 저장
          </label>

          {ui.error ? (
            <p role="alert" className="text-sm text-red-600">
              {ui.error}
            </p>
          ) : null}
          {ui.info ? <p className="text-sm text-emerald-700">{ui.info}</p> : null}

          <button
            type="submit"
            disabled={ui.loading}
            className="w-full rounded-sm bg-[#1e3a8a] py-3 text-sm font-bold text-white hover:bg-[#1e40af] disabled:opacity-60"
          >
            {ui.loading ? "로그인 중…" : "로그인"}
          </button>
        </form>

        <p className="mt-3 text-center text-xs text-slate-500">
          <Link href="/abc/signup" className="hover:underline">
            회원가입
          </Link>
          <span className="mx-2 text-slate-300">|</span>
          <button
            type="button"
            className="hover:underline"
            onClick={() => patchUi({ info: "인증서 로그인은 준비 중입니다.", error: null })}
          >
            인증서로그인
          </button>
          <span className="mx-2 text-slate-300">|</span>
          <button
            type="button"
            className="hover:underline"
            onClick={() => patchUi({ info: "인증서 안내는 준비 중입니다.", error: null })}
          >
            인증서안내
          </button>
        </p>

        <div className="mt-5 space-y-2.5">
          {SOCIAL.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                if (s.id === "naver") {
                  if (hasNaverConsent()) {
                    router.push("/abc/oauth/naver");
                  } else {
                    router.push("/abc/signup");
                  }
                  return;
                }
                if (s.id === "kakao") {
                  if (hasKakaoConsent()) {
                    router.push("/abc/oauth/kakao");
                  } else {
                    router.push("/abc/signup/kakao");
                  }
                  return;
                }
                patchUi({
                  info: `${s.label} — 소셜 연동은 준비 중. 개발은 일반 로그인(api.abc.com)만 사용하세요.`,
                  error: null,
                });
              }}
              className={`flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-left text-sm font-semibold ${s.className}`}
            >
              <span
                className={`flex size-8 shrink-0 items-center justify-center rounded-sm text-xs font-black ${s.markClass}`}
              >
                {"apple" in s && s.apple ? (
                  <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
                    <path d="M16.7 12.6c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.2-2.8.9-3.5.9-.7 0-1.9-.8-3.1-.8-1.6 0-3.1 1-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.6.8 1.1 1.7 2.4 3 2.3 1.2 0 1.6-.8 3.1-.8s1.8.8 3.1.7c1.3 0 2.1-1.1 2.9-2.2.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.4-1-2.4-3.8zM14.2 5.8c.6-.8 1.1-1.9.9-3-.9 0-2 .6-2.6 1.4-.6.7-1.1 1.9-.9 3 1 .1 2-.5 2.6-1.4z" />
                  </svg>
                ) : (
                  s.mark
                )}
              </span>
              <span className="flex-1 text-center pr-8">{s.label}</span>
            </button>
          ))}
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          API: <span className="font-mono">{getAbcApiBaseUrl()}</span> · 일반 로그인만 연동
        </p>
      </div>
    </main>
  );
}
