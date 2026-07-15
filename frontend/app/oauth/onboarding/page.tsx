"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, GraduationCap, Rocket } from "lucide-react";

import { getAuthSession } from "@/lib/auth-api";
import {
  INDUSTRY_OPTIONS,
  USER_TYPE_OPTIONS,
  isWorkSituationComplete,
  loadMyPagePreferences,
  needsProfileOnboarding,
  saveMyPagePreferences,
  type Industry,
  type UserType,
} from "@/lib/mypage-preferences";
import { routes } from "@/lib/routes";

const TYPE_ICONS = {
  직장인: BriefcaseBusiness,
  학생: GraduationCap,
  프리랜서_창업자: Rocket,
} as const;

type Step = 1 | 2;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [userType, setUserType] = useState<UserType | null>(null);
  const [industry, setIndustry] = useState<Industry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  useEffect(() => {
    const session = getAuthSession();
    if (!session) {
      router.replace(`${routes.oauth.login}?next=${encodeURIComponent(routes.oauth.onboarding)}`);
      return;
    }
    setUserId(session.user_id);
    const prefs = loadMyPagePreferences(session.user_id);
    if (!needsProfileOnboarding(prefs)) {
      router.replace(routes.home);
    }
  }, [router]);

  const finish = (nextType: UserType, nextIndustry: Industry | null) => {
    if (userId == null) return;
    if (!isWorkSituationComplete(nextType, nextIndustry)) {
      setError("업종을 선택해 주세요.");
      return;
    }
    const prefs = loadMyPagePreferences(userId);
    saveMyPagePreferences(userId, {
      ...prefs,
      userType: nextType,
      industry: nextType === "직장인" ? nextIndustry : null,
    });
    router.replace(routes.home);
    router.refresh();
  };

  const selectUserType = (value: UserType) => {
    setError(null);
    setUserType(value);
    if (value === "직장인") {
      setIndustry(null);
      setStep(2);
      return;
    }
    finish(value, null);
  };

  const selectIndustry = (value: Industry) => {
    setError(null);
    setIndustry(value);
    if (userType) finish(userType, value);
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center moneo-grid-bg px-4 py-12 text-[var(--moneo-text)]">
      <div className="moneo-noise pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <Link href={routes.home} className="text-2xl font-semibold tracking-tight text-white">
            Moneo
          </Link>
          <p className="mt-2 text-sm text-[var(--moneo-muted)]">
            맞춤형 브리핑을 위해 업무 상황을 알려 주세요
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[rgba(18,18,28,0.72)] p-6 shadow-[0_0_40px_rgba(99,102,241,0.15)] backdrop-blur-md sm:p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-indigo-300/75">
            step {step} / {userType === "직장인" || step === 2 ? 2 : 1}
          </p>

          {step === 1 ? (
            <>
              <h1 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                어떤 상황이신가요?
              </h1>
              <p className="mt-2 text-sm text-[var(--moneo-muted)]">
                선택에 맞춰 일정·브리핑 예시의 톤이 달라집니다.
              </p>
              <div className="mt-6 grid gap-3">
                {USER_TYPE_OPTIONS.map((opt) => {
                  const Icon = TYPE_ICONS[opt.value];
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => selectUserType(opt.value)}
                      className="flex w-full items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-colors hover:border-indigo-400/40 hover:bg-indigo-500/10"
                    >
                      <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-500/15 text-indigo-300">
                        <Icon size={20} aria-hidden />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-white">
                          {opt.label}
                        </span>
                        <span className="mt-0.5 block text-xs text-[var(--moneo-muted)]">
                          {opt.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <h1 className="mt-2 text-xl font-semibold text-white sm:text-2xl">
                어떤 업무를 하시나요?
              </h1>
              <p className="mt-2 text-sm text-[var(--moneo-muted)]">
                업종에 맞는 예시로 업무 브리핑을 구성합니다.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {INDUSTRY_OPTIONS.map((opt) => {
                  const selected = industry === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => selectIndustry(opt.value)}
                      className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${
                        selected
                          ? "border-indigo-500 bg-indigo-600 text-white"
                          : "border-white/10 bg-white/[0.03] text-indigo-100/85 hover:border-indigo-400/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setIndustry(null);
                  setError(null);
                }}
                className="mt-6 text-sm text-[var(--moneo-muted)] underline-offset-2 hover:text-indigo-200 hover:underline"
              >
                이전으로
              </button>
            </>
          )}

          {error ? (
            <p role="alert" className="mt-4 text-sm text-red-300">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
