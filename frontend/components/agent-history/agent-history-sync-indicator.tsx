"use client";

type Props = {
  pollingIntervalMs: number;
  isPolling: boolean;
  error: string | null;
};

export function AgentHistorySyncIndicator({
  pollingIntervalMs,
  isPolling,
  error,
}: Props) {
  const seconds = Math.round(pollingIntervalMs / 1000);

  if (error) {
    return (
      <span
        className="inline-flex items-center gap-1.5 font-mono text-[10px] text-rose-300/80"
        role="status"
      >
        <span className="size-1.5 rounded-full bg-rose-400/90" aria-hidden />
        업데이트 실패, 재시도 중
      </span>
    );
  }

  if (!isPolling) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-indigo-200/40">
        <span className="size-1.5 rounded-full bg-zinc-500/80" aria-hidden />
        일시 중지
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-[10px] text-indigo-200/45"
      role="status"
    >
      <span className="size-1.5 rounded-full bg-zinc-500/70" aria-hidden />
      {seconds}초마다 갱신
    </span>
  );
}
