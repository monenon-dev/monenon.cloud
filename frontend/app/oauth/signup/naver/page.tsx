"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

import { saveNaverConsentToken } from "@/lib/social-auth";

type AgreeKey =
  | "thirdParty"
  | "mallTerms"
  | "privacy"
  | "mobileMsg"
  | "talkBenefit";

const REQUIRED: AgreeKey[] = ["thirdParty", "mallTerms", "privacy"];
const OPTIONAL: AgreeKey[] = ["mobileMsg", "talkBenefit"];
const ALL: AgreeKey[] = [...REQUIRED, ...OPTIONAL];

const INITIAL = {
  thirdParty: false,
  mallTerms: false,
  privacy: false,
  mobileMsg: false,
  talkBenefit: false,
} as Record<AgreeKey, boolean>;

function CircleCheck({ checked, large }: { checked: boolean; large?: boolean }) {
  const size = large ? "size-7" : "size-6";
  return (
    <span
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full border-2",
        size,
        checked ? "border-[#03C75A] bg-[#03C75A] text-white" : "border-slate-300 bg-white text-transparent",
      ].join(" ")}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className={large ? "size-4" : "size-3.5"} fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Row({
  checked,
  onToggle,
  title,
  detail,
  showArrow,
}: {
  checked: boolean;
  onToggle: () => void;
  title: ReactNode;
  detail?: ReactNode;
  showArrow?: boolean;
}) {
  return (
    <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 py-3 text-left">
      <CircleCheck checked={checked} />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium leading-snug text-slate-900">{title}</span>
        {detail ? <span className="mt-1 block text-[13px] leading-relaxed text-slate-500">{detail}</span> : null}
      </span>
      {showArrow ? <span className="mt-0.5 shrink-0 text-slate-400">›</span> : null}
    </button>
  );
}

/** 네이버 OAuth 동의 화면 스타일 — Moneo 회원가입 */
export default function NaverSignupConsentPage() {
  const router = useRouter();
  const [ui, setUi] = useState({
    agrees: { ...INITIAL },
    error: null as string | null,
    done: false,
  });

  const patchUi = (patch: Partial<typeof ui>) => setUi((prev) => ({ ...prev, ...patch }));

  const allChecked = useMemo(() => ALL.every((k) => ui.agrees[k]), [ui.agrees]);
  const requiredOk = useMemo(() => REQUIRED.every((k) => ui.agrees[k]), [ui.agrees]);

  const toggle = (key: AgreeKey) => {
    patchUi({
      agrees: { ...ui.agrees, [key]: !ui.agrees[key] },
      error: null,
      done: false,
    });
  };

  const toggleAll = () => {
    const next = !allChecked;
    const agrees = { ...INITIAL };
    for (const k of ALL) agrees[k] = next;
    patchUi({ agrees, error: null, done: false });
  };

  const onAgree = () => {
    if (!requiredOk) {
      patchUi({ error: "필수 항목에 모두 동의해 주세요." });
      return;
    }
    saveNaverConsentToken({ source: "signup_consent" });
    patchUi({ done: true, error: null });
    router.push("/oauth/naver");
  };

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* 상단: 소셜 로그인 헤더 느낌 */}
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="flex size-6 items-center justify-center rounded-sm bg-[#03C75A] text-[11px] font-black text-white">
            N
          </span>
          <span className="text-sm font-semibold text-slate-800">네이버 로그인</span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <span className="flex size-7 items-center justify-center rounded-full bg-slate-200 text-xs text-slate-500">
            👤
          </span>
          <span>Moneo</span>
          <span className="text-slate-400">▾</span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md px-5 pb-10 pt-8">
        {/* 서비스 로고 */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 via-fuchsia-500 to-indigo-600 text-lg font-black text-white shadow-sm">
            a
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">
              <span className="text-[#e11d48]">a</span>
              <span className="text-slate-900">bc.com</span>
            </p>
            <p className="text-xs text-slate-500">회원가입 · 약관 동의</p>
          </div>
        </div>

        {/* 전체 동의 */}
        <button
          type="button"
          onClick={toggleAll}
          className="mb-2 flex w-full items-center gap-3 border-b border-slate-100 py-3 text-left"
        >
          <CircleCheck checked={allChecked} large />
          <span className="text-[16px] font-semibold text-slate-900">전체 동의하기</span>
          <span className="text-[13px] text-slate-400">(선택 동의 포함)</span>
        </button>

        <div className="divide-y divide-slate-100">
          <Row
            checked={ui.agrees.thirdParty}
            onToggle={() => toggle("thirdParty")}
            showArrow
            title={
              <>
                <span className="text-slate-900">[필수] 개인정보 제 3자 제공 동의</span>
              </>
            }
            detail={
              <>
                이용자 식별자, 휴대전화번호, 이름, 이메일 주소, 생일, 출생연도,
                암호화된 동일인 식별정보[CI]
              </>
            }
          />
        </div>

        <p className="mt-5 mb-1 text-[13px] font-semibold text-slate-700">
          Moneo 서비스 약관 및 개인정보 동의
        </p>

        <div className="divide-y divide-slate-100 border-b border-slate-100">
          <Row
            checked={ui.agrees.mallTerms}
            onToggle={() => toggle("mallTerms")}
            showArrow
            title="[필수] 쇼핑몰 이용약관"
          />
          <Row
            checked={ui.agrees.privacy}
            onToggle={() => toggle("privacy")}
            showArrow
            title="[필수] 개인정보 수집 및 이용 동의(필수)"
          />
          <Row
            checked={ui.agrees.mobileMsg}
            onToggle={() => toggle("mobileMsg")}
            title="[선택] 모바일 메시지 수신동의"
          />
        </div>

        <div className="border-b border-slate-100 py-1">
          <Row
            checked={ui.agrees.talkBenefit}
            onToggle={() => toggle("talkBenefit")}
            title="[선택] 네이버에서 톡톡으로 Moneo의 혜택/소식받기 동의"
          />
        </div>

        <p className="mt-6 text-[12px] leading-relaxed text-slate-400">
          네이버에서 제공하는 로그인 기능을 통해 Moneo에 로그인함으로써 귀하는 네이버가
          서비스 제공자가 아님을 확인합니다. 서비스 및 관련 약관에 대한 책임은 Moneo에
          있습니다. Moneo의 서비스 및 개인정보 취급과 관련된 문의는 Moneo으로 해 주세요.
        </p>

        {ui.error ? (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {ui.error}
          </p>
        ) : null}
        {ui.done ? (
          <p className="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            필수 약관에 동의했습니다. 이어서 계정 정보를 입력하는 단계는 API 연동 후 연결하면
            됩니다.
          </p>
        ) : null}

        <div className="mt-8 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => router.push("/oauth/login")}
            className="rounded-md bg-slate-200 py-3.5 text-[15px] font-semibold text-slate-700 hover:bg-slate-300"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onAgree}
            disabled={!requiredOk}
            className={[
              "rounded-md py-3.5 text-[15px] font-semibold text-white",
              requiredOk ? "bg-slate-500 hover:bg-slate-600" : "cursor-not-allowed bg-slate-300",
            ].join(" ")}
          >
            동의하기
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          <Link href="/oauth/login" className="hover:underline">
            로그인으로 돌아가기
          </Link>
          <span className="mx-2">·</span>
          <Link href="/oauth/signup/kakao" className="hover:underline">
            카카오 동의 화면
          </Link>
        </p>
      </div>
    </main>
  );
}
