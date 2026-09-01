"use client";

import type { ReactNode } from "react";
import {
  BriefcaseBusiness,
  GraduationCap,
  Rocket,
  UserCircle,
  type LucideIcon,
} from "lucide-react";

import { IndustryCombobox } from "@/components/settings/industry-combobox";
import type { AgentWorkProfile, WorkTone } from "@/lib/agent-settings-store";
import { WORK_TONE_OPTIONS } from "@/lib/agent-settings-store";
import { USER_TYPE_OPTIONS, type UserType } from "@/lib/mypage-preferences";

const TYPE_ICONS = {
  직장인: BriefcaseBusiness,
  학생: GraduationCap,
  프리랜서_창업자: Rocket,
} as const;

type WorkProfileTabProps = {
  profile: AgentWorkProfile;
  profilePickerOpen: boolean;
  onProfilePickerOpenChange: (open: boolean) => void;
  onPatchProfile: (patch: Partial<AgentWorkProfile>) => void;
  saveBar: ReactNode;
};

function selectedUserTypeLabel(userType: UserType | null): string {
  if (!userType) return "선택되지 않음";
  return USER_TYPE_OPTIONS.find((o) => o.value === userType)?.label ?? userType;
}

function SelectedTypeIcon({
  userType,
}: {
  userType: UserType | null;
}): ReactNode {
  if (!userType) return <UserCircle size={16} className="text-gray-400" aria-hidden />;
  const Icon: LucideIcon = TYPE_ICONS[userType];
  return <Icon size={16} className="text-indigo-600 dark:text-indigo-400" aria-hidden />;
}

export function WorkProfileTab({
  profile,
  profilePickerOpen,
  onProfilePickerOpenChange,
  onPatchProfile,
  saveBar,
}: WorkProfileTabProps) {
  const selectUserType = (value: UserType) => {
    onPatchProfile({ userType: value });
    onProfilePickerOpenChange(false);
  };

  const addCustomIndustry = (label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const exists = profile.customIndustries.some(
      (item) => item.toLowerCase() === trimmed.toLowerCase()
    );
    onPatchProfile({
      industry: trimmed,
      customIndustries: exists ? profile.customIndustries : [...profile.customIndustries, trimmed],
    });
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900/40">
      <div className="mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
        <UserCircle size={22} />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">업무 프로필</h2>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        브리핑 예시, 일정 템플릿, 리포트 톤에 반영되는 업무 프로필입니다.
      </p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-gray-500">현재 프로필</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/35 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-800 dark:border-indigo-500/30 dark:bg-indigo-950/40 dark:text-indigo-200">
            <SelectedTypeIcon userType={profile.userType} />
            {selectedUserTypeLabel(profile.userType)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-500">
            상황이 바뀌면 언제든 다시 선택할 수 있어요.
          </span>
        </div>
        <button
          type="button"
          onClick={() => onProfilePickerOpenChange(!profilePickerOpen)}
          className="shrink-0 self-start text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          {profilePickerOpen ? "닫기" : "변경"}
        </button>
      </div>

      {profilePickerOpen ? (
        <div className="mt-4 grid gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
          {USER_TYPE_OPTIONS.map((opt) => {
            const Icon = TYPE_ICONS[opt.value];
            const selected = profile.userType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => selectUserType(opt.value)}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                  selected
                    ? "border-indigo-600 bg-indigo-50 ring-1 ring-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/40"
                    : "border-gray-200 bg-white hover:border-indigo-300 dark:border-gray-700 dark:bg-gray-900/50 dark:hover:border-indigo-700"
                }`}
              >
                <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/25 bg-indigo-500/15 text-indigo-600 dark:text-indigo-300">
                  <Icon size={20} aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {opt.label}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                    {opt.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mt-8 border-t border-gray-100 pt-6 dark:border-gray-800">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">업종</p>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          브리핑 예시와 리포트 용어가 업종에 맞게 조정됩니다.
        </p>
        <div className="mt-3">
          <IndustryCombobox
            value={profile.industry}
            customIndustries={profile.customIndustries}
            onChange={(industry) => onPatchProfile({ industry })}
            onAddCustom={addCustomIndustry}
          />
        </div>
      </div>

      <div className="mt-8">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">업무 톤</p>
        <div className="flex flex-wrap gap-2">
          {WORK_TONE_OPTIONS.map((opt) => {
            const selected = profile.workTone === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onPatchProfile({ workTone: opt.value as WorkTone })}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                  selected
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {saveBar}
    </section>
  );
}
