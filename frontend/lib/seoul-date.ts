const SEOUL = "Asia/Seoul";

/** Asia/Seoul 기준 YYYY-MM-DD */
export function todaySeoulISO(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Asia/Seoul 기준 「2026년 8월 18일 화요일」 */
export function todaySeoulLabel(now = new Date()): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: SEOUL,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(now);
}

const DATE_LINE =
  /^(\*\*)?\d{4}년\s*\d{1,2}월\s*\d{1,2}일(?:\s*[월화수목금토일]요일)?(\*\*)?\s*$/;

/** 브리핑 본문 맨 앞 날짜를 오늘(서울)로 맞춘다. */
export function ensureTodayDateInBriefing(text: string, label = todaySeoulLabel()): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  while (lines.length > 0 && !lines[0]!.trim()) lines.shift();
  if (lines.length > 0 && DATE_LINE.test(lines[0]!.trim())) {
    const wasBold = lines[0]!.trim().startsWith("**");
    lines[0] = wasBold ? `**${label}**` : label;
    return lines.join("\n").trim();
  }
  const body = lines.join("\n").trim();
  return body ? `**${label}**\n\n${body}` : `**${label}**`;
}
