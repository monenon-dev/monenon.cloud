"use client";

import { Loader2 } from "lucide-react";

import { mypageCardClass } from "@/components/mypage/mypage-sidebar-layout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  INTEREST_OPTIONS,
  SPEECH_TONE_OPTIONS,
  type MyPagePreferences,
  type SpeechTone,
} from "@/lib/mypage-preferences";

type PreferencesSectionProps = {
  prefs: MyPagePreferences;
  saving: boolean;
  savedMessage: string | null;
  error: string | null;
  onChange: (patch: Partial<MyPagePreferences>) => void;
  onSave: () => void;
};

export function PreferencesSection({
  prefs,
  saving,
  savedMessage,
  error,
  onChange,
  onSave,
}: PreferencesSectionProps) {
  const toggleInterest = (interest: string) => {
    const next = prefs.interests.includes(interest)
      ? prefs.interests.filter((item) => item !== interest)
      : [...prefs.interests, interest];
    onChange({ interests: next });
  };

  return (
    <div className="space-y-6">
      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
      {savedMessage && (
        <p className="rounded-2xl border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/40 px-4 py-3 text-sm text-green-700 dark:text-green-300">
          {savedMessage}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className={mypageCardClass}>
          <Label htmlFor="speech-tone" className="text-base font-semibold">
            말투 변경
          </Label>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            AI 에이전트가 대화할 때 사용할 말투를 선택합니다.
          </p>
          <Select
            value={prefs.speechTone}
            onValueChange={(value) => onChange({ speechTone: value as SpeechTone })}
          >
            <SelectTrigger id="speech-tone" className="mt-4 w-full">
              <SelectValue placeholder="말투 선택" />
            </SelectTrigger>
            <SelectContent>
              {SPEECH_TONE_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <section className={mypageCardClass}>
          <Label htmlFor="agent-name" className="text-base font-semibold">
            에이전트 이름
          </Label>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            홈 화면과 채팅에서 부를 AI 이름을 설정합니다.
          </p>
          <Input
            id="agent-name"
            name="agentName"
            value={prefs.agentName}
            onChange={(e) => onChange({ agentName: e.target.value })}
            className="mt-4"
            placeholder="예: 모네난"
            maxLength={24}
          />
        </section>
      </div>

      <section className={mypageCardClass}>
        <h3 className="text-base font-semibold">관심 분야</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          맞춤 추천에 반영할 주제를 선택하세요. (복수 선택 가능)
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((interest) => {
            const selected = prefs.interests.includes(interest);
            return (
              <button
                key={interest}
                type="button"
                onClick={() => toggleInterest(interest)}
                aria-pressed={selected}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  selected
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                    : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-300 hover:border-indigo-300"
                }`}
              >
                {interest}
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          설정 저장
        </button>
      </div>
    </div>
  );
}
