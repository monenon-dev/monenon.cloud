"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";

import { saveKakaoConsentToken } from "@/lib/social-auth";
import { MoneoServiceBrand } from "@/components/brand/moneo-service-brand";
import { PRODUCT_NAME, SITE_NAME } from "@/lib/site-brand";
import { routes } from "@/lib/routes";

type AgreeKey =
  | "kakaoRequired"
  | "kakaoOptional"
  | "age"
  | "birthYear"
  | "birthday"
  | "mallTerms"
  | "privacy"
  | "sms"
  | "channel";

const REQUIRED: AgreeKey[] = ["kakaoRequired", "mallTerms", "privacy"];

const INITIAL: Record<AgreeKey, boolean> = {
  kakaoRequired: false,
  kakaoOptional: false,
  age: false,
  birthYear: false,
  birthday: false,
  mallTerms: false,
  privacy: false,
  sms: false,
  channel: false,
};

function Check({ checked }: { checked: boolean }) {
  return (
    <span
      className={[
        "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center",
        checked ? "text-[#191919]" : "text-slate-300",
      ].join(" ")}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M5 12.5l4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Line({
  checked,
  onToggle,
  children,
  arrow,
}: {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
  arrow?: boolean;
}) {
  return (
    <button type="button" onClick={onToggle} className="flex w-full items-start gap-2 py-2.5 text-left">
      <Check checked={checked} />
      <span className="min-w-0 flex-1 text-[14px] leading-snug text-[#191919]">{children}</span>
      {arrow ? <span className="shrink-0 text-slate-400">›</span> : null}
    </button>
  );
}

/** 카카오 로그인 동의 화면 스타일 — Moneo */
export default function KakaoSignupConsentPage() {
  const router = useRouter();
  const [ui, setUi] = useState({
    agrees: { ...INITIAL },
    account: "user@kakao.com",
    error: null as string | null,
    done: false,
  });

  const patchUi = (patch: Partial<typeof ui>) => setUi((prev) => ({ ...prev, ...patch }));

  const requiredOk = useMemo(() => REQUIRED.every((k) => ui.agrees[k]), [ui.agrees]);

  const allKeys = Object.keys(INITIAL) as AgreeKey[];
  const allChecked = allKeys.every((k) => ui.agrees[k]);

  const toggle = (key: AgreeKey) => {
    const next = { ...ui.agrees, [key]: !ui.agrees[key] };
    // optional parent toggles children together when parent flips on/off
    if (key === "kakaoOptional") {
      const v = next.kakaoOptional;
      next.age = v;
      next.birthYear = v;
      next.birthday = v;
    }
    if (key === "age" || key === "birthYear" || key === "birthday") {
      next.kakaoOptional = next.age && next.birthYear && next.birthday;
    }
    patchUi({ agrees: next, error: null, done: false });
  };

  const selectAll = () => {
    const v = !allChecked;
    const agrees = { ...INITIAL };
    for (const k of allKeys) agrees[k] = v;
    patchUi({ agrees, error: null, done: false });
  };

  const onContinue = () => {
    if (!requiredOk) {
      patchUi({ error: "필수 동의 항목을 모두 선택해 주세요." });
      return;
    }
    saveKakaoConsentToken({ source: "kakao_consent" });
    patchUi({ done: true, error: null });
    router.push("/oauth/kakao");
  };

  return (
    <main className="flex min-h-screen justify-center bg-[#f5f5f5] px-4 py-8 text-[#191919]">
      <div className="flex w-full max-w-[400px] flex-col">
        <p className="mb-8 text-center text-[22px] font-semibold tracking-tight">kakao</p>

        <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white px-5 py-6 shadow-sm">
          <MoneoServiceBrand subtitle={`${PRODUCT_NAME} · 카카오 로그인 동의`} logoSize={40} />

          {/* 계정 */}
          <div className="mb-4 flex items-center justify-between rounded-lg bg-[#f5f5f5] px-3 py-3">
            <span className="truncate text-[14px] text-slate-700">{ui.account}</span>
            <button
              type="button"
              className="shrink-0 text-[13px] text-slate-500 hover:text-slate-800"
              onClick={() =>
                patchUi({
                  account: ui.account === "user@kakao.com" ? "demo@kakao.com" : "user@kakao.com",
                })
              }
            >
              변경 &gt;
            </button>
          </div>

          <p className="mb-4 text-[12px] leading-relaxed text-slate-500">
            전체 선택하기는 선택 항목을 포함하고 있으며, 선택 항목에 동의하지 않아도 서비스를
            이용할 수 있습니다.
          </p>

          <h2 className="mb-1 text-[15px] font-bold">카카오 로그인 동의</h2>
          <p className="mb-3 text-[13px] leading-relaxed text-slate-500">
            {SITE_NAME} 서비스 이용을 위해 회원번호와 함께 개인정보가 제공됩니다.
          </p>

          <Line checked={ui.agrees.kakaoRequired} onToggle={() => toggle("kakaoRequired")} arrow>
            <span>
              <span className="font-semibold">(필수) 카카오 개인정보 제3자 제공 동의</span>
              <span className="mt-1 block text-[12px] font-normal text-slate-500">
                닉네임, 프로필 사진, 카카오계정(이메일), 배송지정보(수령인명, 배송지 주소,
                수령인 연락처), 카카오계정(전화번호), 이름
              </span>
            </span>
          </Line>

          <Line checked={ui.agrees.kakaoOptional} onToggle={() => toggle("kakaoOptional")} arrow>
            <span className="font-semibold">(선택) 카카오 개인정보 제3자 제공 동의</span>
          </Line>
          <div className="mb-2 ml-7 space-y-1">
            {(
              [
                ["age", "연령대"],
                ["birthYear", "출생 연도"],
                ["birthday", "생일"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => toggle(key)}
                className="flex items-center gap-2 py-1 text-[13px] text-slate-600"
              >
                <Check checked={ui.agrees[key]} />
                {label}
              </button>
            ))}
          </div>

          <div className="my-4 border-t border-slate-100" />

          <h2 className="mb-1 text-[15px] font-bold">{SITE_NAME} 서비스 동의</h2>
          <p className="mb-2 text-[13px] text-slate-500">
            {SITE_NAME} 서비스 이용을 위해 설정한 동의항목입니다.
          </p>

          <Line checked={ui.agrees.mallTerms} onToggle={() => toggle("mallTerms")} arrow>
            <span className="font-semibold">(필수) 쇼핑몰 이용약관</span>
          </Line>
          <Line checked={ui.agrees.privacy} onToggle={() => toggle("privacy")} arrow>
            <span className="font-semibold">(필수) 개인정보 수집 및 이용 동의</span>
          </Line>
          <Line checked={ui.agrees.sms} onToggle={() => toggle("sms")}>
            (선택) SMS 수신 동의
          </Line>
          <Line checked={ui.agrees.channel} onToggle={() => toggle("channel")}>
            (선택) {SITE_NAME} 채널을 친구로 추가하고, 광고와 마케팅 메시지를 카카오톡으로 받습니다.
          </Line>

          <div className="my-5 border-t border-slate-100" />

          <h3 className="mb-2 text-[14px] font-bold">안내사항</h3>
          <p className="text-[12px] leading-relaxed text-slate-500">
            · 본 서비스는 카카오 로그인을 이용합니다. 서비스 제공 및 개인정보 처리에 대한 책임은{" "}
            {PRODUCT_NAME}에 있으며, 수집된 정보는 {SITE_NAME} 약관·개인정보처리방침에 따라 관리됩니다.
          </p>

          {ui.error ? (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {ui.error}
            </p>
          ) : null}
          {ui.done ? (
            <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
              동의 완료. 카카오 OAuth 콜백 연동 후 가입을 이어가면 됩니다.
            </p>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={selectAll}
            className="w-full rounded-md bg-[#FEE500] py-3.5 text-[15px] font-bold text-[#191919] hover:brightness-95"
          >
            {allChecked ? "전체 선택 해제" : "전체 선택하기"}
          </button>
          <button
            type="button"
            onClick={onContinue}
            disabled={!requiredOk}
            className={[
              "w-full rounded-md py-3.5 text-[15px] font-bold",
              requiredOk
                ? "bg-[#FEE500] text-[#191919] hover:brightness-95"
                : "cursor-not-allowed bg-slate-200 text-white",
            ].join(" ")}
          >
            동의하고 계속하기
          </button>
          <button
            type="button"
            onClick={() => router.push(routes.oauth.login)}
            className="w-full py-2 text-center text-[13px] text-slate-500 hover:underline"
          >
            취소 · 로그인으로
          </button>
          <p className="text-center text-[11px] text-slate-400">
            <Link href={routes.oauth.signupNaver} className="hover:underline">
              네이버 동의 화면
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
