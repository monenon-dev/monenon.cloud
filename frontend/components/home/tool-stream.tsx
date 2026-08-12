"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";

export type ToolNodeStatus =
  | "success"
  | "error"
  | "pending"
  | "running"
  | "failed"
  | "retrying";

export interface ToolCallResult {
  id: string;
  timestamp: string;
  toolName: string;
  status: ToolNodeStatus;
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
  /** LangGraph 노드명 (확장) */
  node?: string;
  /** synthesizer/validator 재시도 회차 */
  attempt?: number;
  /** 짧은 상태 설명 */
  detail?: string;
}

export type ToolStreamProps = {
  items: ToolCallResult[];
  onRetry?: (item: ToolCallResult) => void;
  /** Fired when a rag hit row is clicked (docs.search / vector.query). */
  onRagItemClick?: (
    item: ToolCallResult,
    hit: NonNullable<NonNullable<ToolCallResult["result"]>["items"]>[number],
    hitIndex: number
  ) => void;
  className?: string;
};

function formatParams(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join(" · ");
}

function nodeKey(item: ToolCallResult): string {
  return item.node || item.toolName;
}

function isTerminalSuccess(status: ToolNodeStatus): boolean {
  return status === "success";
}

function isFailedLike(status: ToolNodeStatus): boolean {
  return status === "failed" || status === "error";
}

function isBusy(status: ToolNodeStatus): boolean {
  return status === "pending" || status === "running" || status === "retrying";
}

/** 같은 노드의 이후 성공이 있으면 이전 실패 시도를 흐리게 */
function computeSuperseded(items: ToolCallResult[]): Set<string> {
  const superseded = new Set<string>();
  const latestSuccessAttempt = new Map<string, number>();

  for (const item of items) {
    if (!isTerminalSuccess(item.status)) continue;
    const key = nodeKey(item);
    const attempt = item.attempt ?? 1;
    const prev = latestSuccessAttempt.get(key) ?? 0;
    if (attempt >= prev) latestSuccessAttempt.set(key, attempt);
  }

  for (const item of items) {
    const key = nodeKey(item);
    const attempt = item.attempt ?? 1;
    const successAt = latestSuccessAttempt.get(key);
    if (successAt == null) continue;
    if (isFailedLike(item.status) && attempt < successAt) {
      superseded.add(item.id);
    }
    if (item.status === "retrying" && attempt <= successAt) {
      superseded.add(item.id);
    }
    // running that was followed by success on same attempt — keep visible unless older pass
    if (isBusy(item.status) && attempt < successAt) {
      superseded.add(item.id);
    }
  }
  return superseded;
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
  onItemClick,
}: {
  items: NonNullable<ToolCallResult["result"]>["items"];
  onItemClick?: (
    hit: NonNullable<NonNullable<ToolCallResult["result"]>["items"]>[number],
    hitIndex: number
  ) => void;
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
        const interactive = Boolean(onItemClick);
        return (
          <li key={`${item.title}-${i}`}>
            {interactive ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onItemClick?.(item, i);
                }}
                className={`w-full rounded-md border border-white/[0.06] bg-black/20 px-2 py-1.5 text-left transition-colors hover:border-indigo-400/30 hover:bg-indigo-500/10 ${
                  low ? "opacity-60" : "opacity-100"
                }`}
              >
                <RagHitContent item={item} />
              </button>
            ) : (
              <div
                className={`rounded-md border border-white/[0.06] bg-black/20 px-2 py-1.5 ${
                  low ? "opacity-60" : "opacity-100"
                }`}
              >
                <RagHitContent item={item} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function RagHitContent({
  item,
}: {
  item: NonNullable<NonNullable<ToolCallResult["result"]>["items"]>[number];
}) {
  return (
    <>
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
    </>
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

function ResultBody({
  item,
  onRagItemClick,
}: {
  item: ToolCallResult;
  onRagItemClick?: ToolStreamProps["onRagItemClick"];
}) {
  if (isBusy(item.status)) {
    const label =
      item.status === "retrying"
        ? "재시도 중…"
        : item.detail || "실행 중…";
    return (
      <div className="flex items-center gap-2 text-[11px] text-sky-300/80">
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        <span>{label}</span>
      </div>
    );
  }

  if (isFailedLike(item.status) && (item.error || item.detail)) {
    return (
      <div className="space-y-2">
        <div className="rounded-md border border-rose-400/20 bg-rose-500/10 px-2.5 py-2">
          {item.error?.code ? (
            <p className="font-mono text-[10px] text-rose-300/90">
              {item.error.code}
            </p>
          ) : null}
          <p className="mt-1 font-mono text-[11px] leading-relaxed text-rose-100/80">
            {item.error?.message || item.detail}
          </p>
        </div>
      </div>
    );
  }

  if (item.detail && !item.result) {
    return (
      <p className="text-[11px] leading-relaxed text-indigo-200/70">{item.detail}</p>
    );
  }

  const type = item.result?.type;
  const items = item.result?.items;
  if (type === "rag") {
    return (
      <RagResultBody
        items={items}
        onItemClick={
          onRagItemClick
            ? (hit, hitIndex) => onRagItemClick(item, hit, hitIndex)
            : undefined
        }
      />
    );
  }
  if (type === "list") return <ListResultBody items={items} />;
  if (type === "draft") return <DraftResultBody items={items} />;
  if (item.detail) {
    return (
      <p className="text-[11px] leading-relaxed text-indigo-200/70">{item.detail}</p>
    );
  }
  return (
    <p className="text-[11px] text-indigo-200/50">결과 페이로드 없음</p>
  );
}

function StatusIcon({ status }: { status: ToolNodeStatus }) {
  const busy = isBusy(status);
  const failed = isFailedLike(status);
  const ok = isTerminalSuccess(status);
  return (
    <span className="relative mt-0.5 size-3.5 shrink-0">
      <Loader2
        className={`absolute inset-0 size-3.5 animate-spin text-sky-400 transition-opacity duration-300 ${
          busy ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      />
      <XCircle
        className={`absolute inset-0 size-3.5 text-rose-400 transition-opacity duration-300 ${
          failed ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      />
      <CheckCircle2
        className={`absolute inset-0 size-3.5 text-emerald-400 transition-opacity duration-300 ${
          ok ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      />
    </span>
  );
}

function AttemptBadge({
  attempt,
  status,
  superseded,
}: {
  attempt?: number;
  status: ToolNodeStatus;
  superseded: boolean;
}) {
  if (attempt == null || attempt < 1) return null;
  const label = `${attempt}차 시도`;
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border px-1 py-0.5 font-mono text-[9px] tracking-wide ${
        superseded
          ? "border-white/10 text-indigo-200/40 line-through"
          : status === "retrying"
            ? "border-amber-400/35 bg-amber-500/10 text-amber-200/90"
            : isFailedLike(status)
              ? "border-rose-400/30 bg-rose-500/10 text-rose-200/80"
              : "border-indigo-400/25 bg-indigo-500/10 text-indigo-200/80"
      }`}
    >
      {label}
    </span>
  );
}

function AutoRecheckBadge({ item }: { item: ToolCallResult }) {
  const node = nodeKey(item);
  const isValidator = node === "validator" || item.toolName.includes("validate");
  if (!isValidator) return null;
  const detail = item.detail || "";
  const show =
    isFailedLike(item.status) ||
    detail.includes("재호출") ||
    detail.includes("자동 재검증") ||
    detail.includes("경고");
  if (!show) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-0.5 rounded border border-amber-400/35 bg-amber-500/15 px-1 py-0.5 text-[9px] font-medium text-amber-100/90">
      <AlertTriangle className="size-2.5" aria-hidden />
      {isFailedLike(item.status) ? "검증 실패" : "자동 재검증됨"}
    </span>
  );
}

/**
 * Tool Stream — clickable accordion rows for live agent tool calls.
 * Mock/API data is injected via `items` (keep fixtures outside this file).
 */
export function ToolStream({
  items,
  onRetry,
  onRagItemClick,
  className = "",
}: ToolStreamProps) {
  const [ui, setUi] = useState({
    expanded: {} as Record<string, boolean>,
  });

  const supersededIds = useMemo(() => computeSuperseded(items), [items]);

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
        const superseded = supersededIds.has(item.id);
        const subtitle = item.detail || paramLine || "—";
        return (
          <div
            key={item.id}
            className={`tool-stream-row overflow-hidden rounded-lg border transition-[colors,opacity] duration-200 ease-out ${
              superseded
                ? "border-white/[0.04] bg-white/[0.01] opacity-45"
                : open
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
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="truncate text-indigo-100/45">{item.timestamp}</p>
                  <AttemptBadge
                    attempt={item.attempt}
                    status={item.status}
                    superseded={superseded}
                  />
                  <AutoRecheckBadge item={item} />
                </div>
                <p
                  className={`truncate text-indigo-100 ${
                    superseded ? "line-through decoration-indigo-200/40" : ""
                  }`}
                  title={item.toolName}
                >
                  {item.toolName}
                </p>
                <p
                  className={`truncate text-indigo-200/55 ${
                    superseded ? "line-through decoration-indigo-200/30" : ""
                  }`}
                  title={subtitle}
                >
                  {subtitle}
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
                      <ResultBody item={item} onRagItemClick={onRagItemClick} />
                      {isFailedLike(item.status) && onRetry ? (
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
