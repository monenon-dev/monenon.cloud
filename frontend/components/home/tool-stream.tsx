"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";

export interface ToolCallResult {
  id: string;
  timestamp: string;
  toolName: string;
  status: "success" | "error" | "pending";
  params: Record<string, string | number>;
  result?: {
    type: "rag" | "list" | "draft";
    items?: Array<{
      title: string;
      preview?: string;
      score?: number;
      meta?: string;
    }>;
  };
  error?: {
    code: string;
    message: string;
  };
}

export type ToolStreamProps = {
  items: ToolCallResult[];
  onRetry?: (item: ToolCallResult) => void;
  className?: string;
};

function formatParams(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join(" · ");
}

function SimilarityBadge({ score }: { score: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, score)) * 100);
  return (
    <div className="flex min-w-[4.5rem] items-center gap-1.5">
      <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-indigo-400/80 transition-[width] duration-200 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-[10px] tabular-nums text-indigo-200/80">
        {score.toFixed(2)}
      </span>
    </div>
  );
}

function RagResultBody({
  items,
}: {
  items: NonNullable<ToolCallResult["result"]>["items"];
}) {
  if (!items?.length) {
    return (
      <p className="text-[11px] leading-relaxed text-indigo-200/50">
        검색 결과 없음
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => {
        const low = typeof item.score === "number" && item.score < 0.5;
        return (
          <li
            key={`${item.title}-${i}`}
            className={`rounded-md border border-white/[0.06] bg-black/20 px-2 py-1.5 ${
              low ? "opacity-60" : "opacity-100"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-indigo-50">
                {item.title}
              </p>
              {typeof item.score === "number" ? (
                <SimilarityBadge score={item.score} />
              ) : null}
            </div>
            {item.preview ? (
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-indigo-200/55">
                {item.preview}
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function ListResultBody({
  items,
}: {
  items: NonNullable<ToolCallResult["result"]>["items"];
}) {
  if (!items?.length) {
    return (
      <p className="text-[11px] leading-relaxed text-indigo-200/50">
        항목 없음
      </p>
    );
  }
  return (
    <ul className="divide-y divide-white/[0.05]">
      {items.map((item, i) => (
        <li
          key={`${item.title}-${i}`}
          className="flex items-baseline justify-between gap-2 py-1.5 first:pt-0 last:pb-0"
        >
          <span className="min-w-0 truncate text-[11px] text-indigo-100">
            {item.title}
          </span>
          {(item.meta || item.preview) && (
            <span className="shrink-0 font-mono text-[10px] text-indigo-300/60">
              {item.meta ?? item.preview}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function DraftResultBody({
  items,
}: {
  items: NonNullable<ToolCallResult["result"]>["items"];
}) {
  const draft = items?.[0];
  if (!draft) {
    return (
      <p className="text-[11px] leading-relaxed text-indigo-200/50">
        초안 없음
      </p>
    );
  }
  return (
    <div className="space-y-1.5 rounded-md border border-indigo-400/15 bg-indigo-500/[0.07] px-2.5 py-2">
      <p className="text-[11px] font-medium leading-snug text-indigo-50">
        {draft.title}
      </p>
      {draft.meta ? (
        <p className="font-mono text-[10px] text-indigo-300/70">
          to · {draft.meta}
        </p>
      ) : null}
      {draft.preview ? (
        <p className="line-clamp-2 text-[10px] leading-relaxed text-indigo-200/60">
          {draft.preview}
        </p>
      ) : null}
    </div>
  );
}

function ResultBody({ item }: { item: ToolCallResult }) {
  if (item.status === "pending") {
    return (
      <div className="flex items-center gap-2 text-[11px] text-sky-300/80">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        <span>검색 중…</span>
      </div>
    );
  }

  if (item.status === "error" && item.error) {
    return (
      <div className="space-y-2">
        <div className="rounded-md border border-rose-400/20 bg-rose-500/10 px-2.5 py-2">
          <p className="font-mono text-[10px] text-rose-300/90">
            {item.error.code}
          </p>
          <p className="mt-1 font-mono text-[11px] leading-relaxed text-rose-100/80">
            {item.error.message}
          </p>
        </div>
      </div>
    );
  }

  const type = item.result?.type;
  const items = item.result?.items;
  if (type === "rag") return <RagResultBody items={items} />;
  if (type === "list") return <ListResultBody items={items} />;
  if (type === "draft") return <DraftResultBody items={items} />;
  return (
    <p className="text-[11px] text-indigo-200/50">결과 페이로드 없음</p>
  );
}

function StatusIcon({ status }: { status: ToolCallResult["status"] }) {
  return (
    <span className="relative mt-0.5 size-3.5 shrink-0">
      <Loader2
        className={`absolute inset-0 size-3.5 animate-spin text-sky-400 transition-opacity duration-300 ${
          status === "pending" ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      />
      <XCircle
        className={`absolute inset-0 size-3.5 text-rose-400 transition-opacity duration-300 ${
          status === "error" ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      />
      <CheckCircle2
        className={`absolute inset-0 size-3.5 text-emerald-400 transition-opacity duration-300 ${
          status === "success" ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      />
    </span>
  );
}

/**
 * Tool Stream — clickable accordion rows for live agent tool calls.
 * Mock/API data is injected via `items` (keep fixtures outside this file).
 */
export function ToolStream({ items, onRetry, className = "" }: ToolStreamProps) {
  const [ui, setUi] = useState({
    expanded: {} as Record<string, boolean>,
  });

  const toggle = (id: string) => {
    setUi((prev) => ({
      expanded: { ...prev.expanded, [id]: !prev.expanded[id] },
    }));
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-live="polite">
      {items.map((item) => {
        const open = Boolean(ui.expanded[item.id]);
        const paramLine = formatParams(item.params);
        return (
          <div
            key={item.id}
            className={`tool-stream-row overflow-hidden rounded-lg border transition-colors duration-200 ease-out ${
              open
                ? "border-indigo-400/25 bg-white/[0.03]"
                : "border-white/5 bg-white/[0.02] hover:bg-white/[0.035]"
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              aria-expanded={open}
              className="flex w-full items-start gap-2 px-2.5 py-2 text-left"
            >
              <StatusIcon status={item.status} />
              <div className="min-w-0 flex-1 font-mono text-[11px] leading-snug">
                <p className="truncate text-indigo-100/45">{item.timestamp}</p>
                <p className="truncate text-indigo-100" title={item.toolName}>
                  {item.toolName}
                </p>
                <p className="truncate text-indigo-200/55" title={paramLine}>
                  {paramLine || "—"}
                </p>
              </div>
              <ChevronRight
                className={`mt-0.5 size-3.5 shrink-0 text-indigo-300/50 transition-transform duration-200 ease-out ${
                  open ? "rotate-90" : "rotate-0"
                }`}
                aria-hidden
              />
            </button>

            <div
              className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="border-t border-white/[0.06] px-2.5 pb-2.5 pt-2">
                  <div className="flex gap-2.5">
                    <span
                      className="mt-0.5 w-0.5 shrink-0 self-stretch rounded-full bg-indigo-400/70"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <ResultBody item={item} />
                      {item.status === "error" && onRetry ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRetry(item);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-md border border-rose-400/25 bg-rose-500/10 px-2 py-1 text-[10px] font-medium text-rose-200/90 transition-colors hover:bg-rose-500/20"
                        >
                          <RotateCcw className="size-3" aria-hidden />
                          재시도
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
