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
          className="rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-300"
        >
          {error}
        </p>
      )}
      {savedMessage && (
        <p className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
          {savedMessage}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className={mypageCardClass}>
          <Label htmlFor="speech-tone" className="text-base font-semibold text-white">
            말투 변경
          </Label>
          <p className="mt-1 text-sm text-[var(--moneo-muted)]">
            선택한 말투가 채팅 응답 생성(시스템 프롬프트)에 반영됩니다.
          </p>
          <Select
            value={prefs.speechTone}
            onValueChange={(value) => onChange({ speechTone: value as SpeechTone })}
          >
            <SelectTrigger
              id="speech-tone"
              className="mt-4 w-full border-[var(--moneo-border)] bg-white/[0.04] text-[var(--moneo-text)]"
            >
              <SelectValue placeholder="말투 선택" />
            </SelectTrigger>
            <SelectContent className="border-[var(--moneo-border)] bg-[var(--moneo-bg-elevated)] text-[var(--moneo-text)]">
              {SPEECH_TONE_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <section className={mypageCardClass}>
          <Label htmlFor="agent-name" className="text-base font-semibold text-white">
            에이전트 이름
          </Label>
          <p className="mt-1 text-sm text-[var(--moneo-muted)]">
            홈 화면과 채팅에서 부를 AI 이름을 설정합니다.
          </p>
          <Input
            id="agent-name"
            name="agentName"
            value={prefs.agentName}
            onChange={(e) => onChange({ agentName: e.target.value })}
            className="mt-4 border-[var(--moneo-border)] bg-white/[0.04] text-[var(--moneo-text)] placeholder:text-[var(--moneo-muted)]"
            placeholder="예: Moneo"
            maxLength={24}
          />
        </section>
      </div>

      <section className={mypageCardClass}>
        <h3 className="text-base font-semibold text-white">주요 활용 분야</h3>
        <p className="mt-1 text-sm text-[var(--moneo-muted)]">
          에이전트가 우선 도울 업무 영역을 선택하세요. (복수 선택 가능)
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
                    ? "border-indigo-500 bg-indigo-600 text-white shadow-[0_0_16px_var(--moneo-glow)]"
                    : "border-[var(--moneo-border)] bg-white/[0.03] text-indigo-100/80 hover:border-indigo-400/40 hover:bg-white/[0.06]"
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
          className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          설정 저장
        </button>
      </div>
    </div>
  );
}
