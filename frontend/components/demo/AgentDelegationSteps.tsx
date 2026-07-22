"use client";

import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import type { DelegationStep } from "@/components/demo/scenarios";

type AgentDelegationStepsProps = {
  steps: DelegationStep[];
  /** How many steps are complete (left → right). Defaults to all. */
  completedCount?: number;
  className?: string;
};

/**
 * Inline multi-agent delegation stepper shown above a composed reply.
 */
export function AgentDelegationSteps({
  steps,
  completedCount,
  className = "",
}: AgentDelegationStepsProps) {
  const [ui, setUi] = useState({ openId: null as string | null });
  const done = completedCount ?? steps.length;

  if (!steps.length) return null;

  return (
    <div
      className={`mb-2 flex flex-wrap items-center gap-1.5 ${className}`}
      aria-label="멀티에이전트 위임 흐름"
    >
      {steps.map((step, i) => {
        const complete = i < done;
        const open = ui.openId === step.id;
        return (
          <div key={step.id} className="relative flex items-center gap-1.5">
            {i > 0 ? (
              <ChevronRight
                className="size-3 shrink-0 text-indigo-300/40"
                aria-hidden
              />
            ) : null}
            <button
              type="button"
              title={step.summary}
              onClick={() =>
                setUi((prev) => ({
                  openId: prev.openId === step.id ? null : step.id,
                }))
              }
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors ${
                complete
                  ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100/90"
                  : "border-white/10 bg-white/[0.03] text-zinc-400"
              }`}
            >
              {complete ? (
                <Check className="size-3 text-emerald-400" aria-hidden />
              ) : (
                <span className="size-1.5 rounded-full bg-zinc-500" aria-hidden />
              )}
              {step.label}
            </button>
            {open ? (
              <div
                role="tooltip"
                className="absolute left-0 top-full z-20 mt-1 w-52 rounded-lg border border-white/10 bg-[#12121a] px-2.5 py-2 text-[11px] leading-relaxed text-zinc-300 shadow-xl"
              >
                {step.summary}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
