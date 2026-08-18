"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { saveTodayBriefingNotes } from "@/lib/briefing-api";

type BriefingNotesFieldProps = {
  userId: number;
  initialNotes?: string;
  className?: string;
};

/** 오늘의 브리핑에 덧붙이는 사용자 메모. 미팅이 아니라 추가 내용. */
export function BriefingNotesField({
  userId,
  initialNotes = "",
  className = "",
}: BriefingNotesFieldProps) {
  const [ui, setUi] = useState({
    draft: initialNotes,
    saved: initialNotes,
    loading: false,
    savedFlash: false,
    error: null as string | null,
  });

  useEffect(() => {
    setUi((prev) => ({ ...prev, draft: initialNotes, saved: initialNotes }));
  }, [initialNotes]);

  const patchUi = (patch: Partial<typeof ui>) =>
    setUi((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    patchUi({ loading: true, error: null, savedFlash: false });
    try {
      const updated = await saveTodayBriefingNotes(userId, ui.draft);
      const notes = updated.user_notes ?? "";
      patchUi({
        loading: false,
        draft: notes,
        saved: notes,
        savedFlash: true,
      });
      window.setTimeout(() => patchUi({ savedFlash: false }), 1600);
    } catch (err) {
      patchUi({
        loading: false,
        error: err instanceof Error ? err.message : "메모를 저장하지 못했습니다.",
      });
    }
  };

  const dirty = ui.draft !== ui.saved;

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className={`rounded-xl border border-indigo-400/20 bg-indigo-500/[0.06] p-3 ${className}`}
    >
      <label
        htmlFor={`briefing-notes-${userId}`}
        className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-indigo-300/80"
      >
        추가 메모
      </label>
      <textarea
        id={`briefing-notes-${userId}`}
        value={ui.draft}
        onChange={(e) => patchUi({ draft: e.target.value, error: null })}
        placeholder="브리핑에 덧붙일 내용 (할 일, 컨텍스트, 기억할 것)"
        maxLength={4000}
        rows={3}
        className="w-full resize-y rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-500 focus:border-indigo-400/50"
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={ui.loading || !dirty}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {ui.loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          {ui.savedFlash ? "저장됨" : "메모 저장"}
        </button>
        {ui.error ? (
          <p role="alert" className="text-xs text-rose-400">
            {ui.error}
          </p>
        ) : (
          <p className="text-[11px] text-zinc-500">미팅이 아니라, 오늘 브리핑에 붙는 메모입니다.</p>
        )}
      </div>
    </form>
  );
}
