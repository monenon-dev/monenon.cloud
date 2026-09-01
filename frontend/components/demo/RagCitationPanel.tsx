"use client";

import { useState } from "react";
import { ExternalLink, X } from "lucide-react";
import type { RagCitation } from "@/components/demo/scenarios";

export type RagCitationPanelProps = {
  open: boolean;
  citations: RagCitation[];
  onClose: () => void;
  className?: string;
};

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, score)) * 100);
  return (
    <div className="flex min-w-[5.5rem] items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ${
            score < 0.5 ? "bg-zinc-500/70" : "bg-indigo-400/85"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[11px] tabular-nums text-indigo-200/80">
        {pct}%
      </span>
    </div>
  );
}

/**
 * Slide-over panel for docs.search / vector.query citations.
 */
export function RagCitationPanel({
  open,
  citations,
  onClose,
  className = "",
}: RagCitationPanelProps) {
  const [ui, setUi] = useState({ modalId: null as string | null });
  const modal = citations.find((c) => c.id === ui.modalId) ?? null;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-white/10 bg-[#0e0e16] shadow-[-20px_0_60px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        } ${className}`}
        aria-hidden={!open}
        aria-label="RAG 인용 패널"
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-indigo-300/80">
              rag citations
            </p>
            <p className="mt-1 text-sm leading-snug text-zinc-300">
              이 답변은 아래 문서를 근거로 생성되었습니다
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 p-1.5 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            aria-label="패널 닫기"
          >
            <X className="size-4" />
          </button>
        </div>

        <ul className="moneo-thin-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
          {citations.map((c) => {
            const low = c.score < 0.5;
            return (
              <li
                key={c.id}
                className={`rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 ${
                  low ? "opacity-50" : "opacity-100"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 flex-1 truncate font-mono text-[12px] text-indigo-50">
                    {c.title}
                  </p>
                  <ScoreBar score={c.score} />
                </div>
                <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-zinc-400">
                  {c.preview}
                </p>
                <button
                  type="button"
                  onClick={() => setUi({ modalId: c.id })}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-indigo-300 hover:text-indigo-200"
                >
                  <ExternalLink className="size-3" aria-hidden />
                  원문 보기
                </button>
              </li>
            );
          })}
          {!citations.length ? (
            <li className="text-sm text-zinc-500">인용 문서가 없습니다.</li>
          ) : null}
        </ul>
      </aside>

      {modal ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal
          aria-label="원문 보기"
          onClick={() => setUi({ modalId: null })}
        >
          <div
            className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#12121a] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="truncate font-mono text-sm text-indigo-100">
                {modal.title}
              </p>
              <button
                type="button"
                onClick={() => setUi({ modalId: null })}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/5"
                aria-label="모달 닫기"
              >
                <X className="size-4" />
              </button>
            </div>
            <pre className="moneo-thin-scrollbar max-h-[60vh] overflow-auto whitespace-pre-wrap p-4 font-mono text-[12px] leading-relaxed text-zinc-300">
              {modal.fullText}
            </pre>
          </div>
        </div>
      ) : null}
    </>
  );
}
