const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** 대시보드 요약용 상대 시간 (예: "5분 전", "2시간 전") */
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const thenMs = then.getTime();
  if (Number.isNaN(thenMs)) return "—";

  const diffMs = now.getTime() - thenMs;
  if (diffMs < 0) return "방금 전";
  if (diffMs < MINUTE_MS) return "방금 전";
  if (diffMs < HOUR_MS) {
    const minutes = Math.floor(diffMs / MINUTE_MS);
    return `${minutes}분 전`;
  }
  if (diffMs < DAY_MS) {
    const hours = Math.floor(diffMs / HOUR_MS);
    return `${hours}시간 전`;
  }
  if (diffMs < DAY_MS * 7) {
    const days = Math.floor(diffMs / DAY_MS);
    return `${days}일 전`;
  }

  return then.toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
  });
}
