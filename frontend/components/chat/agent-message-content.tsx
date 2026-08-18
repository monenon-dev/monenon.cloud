"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import {
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Copy,
  FileBarChart,
  Files,
  FileText,
  RefreshCw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  injectChipsInChildren,
  preserveEscapedBrackets,
} from "@/components/chat/markdown-chip-utils";
import { stripBriefingTitleHeading } from "@/lib/briefing-api";
import { ensureTodayDateInBriefing } from "@/lib/seoul-date";

export type AgentMessageContentProps = {
  text: string;
  streaming?: boolean;
  className?: string;
  onRegenerate?: () => void;
  /** 더 이상 사용하지 않음 — 형식 선택 메뉴가 내장됨 */
  onSaveDocument?: () => void;
  /** 지정 시 텍스트 추론 대신 고정 카드 스타일(briefing/report) 적용 */
  kind?: ResponseKind;
};

type ResponseKind = "briefing" | "organize" | "report" | "general";

type SectionBlock = {
  id: string;
  title: string;
  body: string;
};

function inferKind(text: string): ResponseKind {
  const t = text.toLowerCase();
  if (/브리핑|briefing|오늘\s*일정|하루\s*시작/.test(t)) return "briefing";
  if (/리포트|report|현황|리스크|진행\s*상황/.test(t)) return "report";
  if (/정리|문서|자료|카테고리|분류|노트/.test(t)) return "organize";
  return "general";
}

function countH2(text: string): number {
  return (text.match(/^##\s+.+$/gm) ?? []).length;
}

function summarize(
  kind: ResponseKind,
  text: string
): { Icon: LucideIcon; label: string } {
  const h2 = countH2(text);
  const listItems = (text.match(/^[\s]*[-*•]\s+/gm) ?? []).length;
  switch (kind) {
    case "briefing":
      return {
        Icon: BriefcaseBusiness,
        label:
          h2 > 0
            ? `오늘 업무 브리핑을 ${h2}개 섹션으로 정리했어요`
            : "오늘 업무 브리핑을 준비했어요",
      };
    case "report":
      return {
        Icon: FileBarChart,
        label:
          h2 > 0
            ? `업무 리포트를 ${h2}개 섹션으로 구성했어요`
            : "업무 리포트 초안을 작성했어요",
      };
    case "organize":
      return {
        Icon: Files,
        label:
          listItems > 0
            ? `문서·자료를 ${Math.max(listItems, h2 || 1)}개 항목으로 정리했어요`
            : h2 > 0
              ? `자료를 ${h2}개 카테고리로 정리했어요`
              : "문서와 자료를 주제별로 정리했어요",
      };
    default:
      return {
        Icon: Sparkles,
        label: h2 > 1 ? `답변을 ${h2}개 섹션으로 정리했어요` : "요청하신 내용을 정리했어요",
      };
  }
}

function splitByH2(markdown: string): { intro: string; sections: SectionBlock[] } {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const sections: SectionBlock[] = [];
  const introLines: string[] = [];
  let currentTitle: string | null = null;
  let currentBody: string[] = [];

  const flush = () => {
    if (currentTitle === null) return;
    sections.push({
      id: `sec-${sections.length}-${currentTitle.slice(0, 24)}`,
      title: currentTitle,
      body: currentBody.join("\n").trim(),
    });
    currentBody = [];
  };

  for (const line of lines) {
    const m = /^##\s+(.+)$/.exec(line);
    if (m) {
      flush();
      currentTitle = m[1]!.trim();
      continue;
    }
    if (currentTitle === null) introLines.push(line);
    else currentBody.push(line);
  }
  flush();

  return {
    intro: introLines.join("\n").trim(),
    sections,
  };
}

function MdStrong({ children }: { children?: ReactNode }) {
  return (
    <strong className="font-semibold text-zinc-900 dark:text-zinc-50">
      {injectChipsInChildren(children, "strong")}
    </strong>
  );
}
MdStrong.displayName = "MdStrong";

const mdComponents = {
  p: ({ children }: { children?: ReactNode }) => (
    <p className="mb-2.5 text-sm leading-relaxed text-zinc-700 last:mb-0 dark:text-zinc-200/90">
      {injectChipsInChildren(children, "p")}
    </p>
  ),
  h1: ({ children }: { children?: ReactNode }) => (
    <h2 className="mt-4 mb-2 border-b border-gray-200 pb-1.5 text-base font-semibold tracking-tight text-zinc-900 first:mt-0 dark:border-white/10 dark:text-zinc-100">
      {injectChipsInChildren(children, "h1")}
    </h2>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="mt-4 mb-2 border-b border-gray-200 pb-1.5 text-base font-semibold tracking-tight text-zinc-900 first:mt-0 dark:border-white/10 dark:text-zinc-100">
      {injectChipsInChildren(children, "h2")}
    </h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="mt-3 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-600 dark:text-indigo-300/90">
      {injectChipsInChildren(children, "h3")}
    </h3>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="mb-2.5 list-none space-y-1.5 last:mb-0 [&>li]:relative [&>li]:pl-3.5 [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:top-[0.45rem] [&>li]:before:size-1.5 [&>li]:before:rounded-[2px] [&>li]:before:bg-indigo-500 dark:[&>li]:before:bg-indigo-400/90 [&>li>ul]:mt-1.5 [&>li>ul]:mb-0">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="mb-2.5 list-decimal space-y-1.5 pl-4 text-sm text-zinc-700 last:mb-0 dark:text-zinc-200/90">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-200/90">
      {injectChipsInChildren(children, "li")}
    </li>
  ),
  strong: MdStrong,
  em: ({ children }: { children?: ReactNode }) => (
    <em className="italic text-zinc-600 dark:text-zinc-300/90">
      {injectChipsInChildren(children, "em")}
    </em>
  ),
  a: ({ href, children }: { href?: string; children?: ReactNode }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full items-center rounded-md border border-indigo-400/30 bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[11px] text-indigo-800 underline-offset-2 hover:bg-indigo-500/20 dark:border-indigo-400/25 dark:bg-indigo-500/15 dark:text-indigo-100"
    >
      {children}
    </a>
  ),
  code: ({
    className,
    children,
  }: {
    className?: string;
    children?: ReactNode;
  }) => {
    const block = Boolean(className);
    if (block) {
      return (
        <code className="block overflow-x-auto rounded-lg border border-gray-200 bg-zinc-900/5 p-3 font-mono text-[11px] leading-relaxed text-zinc-800 dark:border-white/10 dark:bg-black/40 dark:text-indigo-100/90">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded-md border border-indigo-400/25 bg-indigo-500/10 px-1.5 py-0.5 font-mono text-[11px] text-indigo-800 dark:border-indigo-400/20 dark:text-indigo-100">
        {children}
      </code>
    );
  },
  pre: ({ children }: { children?: ReactNode }) => (
    <pre className="mb-2.5 overflow-x-auto last:mb-0">{children}</pre>
  ),
  hr: () => <hr className="my-3 border-gray-200 dark:border-white/10" />,
};

function MarkdownBody({ content }: { content: string }) {
  const source = useMemo(
    () => preserveEscapedBrackets(content.replace(/\r\n/g, "\n")),
    [content]
  );

  return (
    <div className="agent-md max-w-full text-sm [overflow-wrap:anywhere]">
      <ReactMarkdown components={mdComponents}>{source}</ReactMarkdown>
    </div>
  );
}

function SectionAccordion({
  sections,
  enabled,
}: {
  sections: SectionBlock[];
  enabled: boolean;
}) {
  const [ui, setUi] = useState({
    collapsed: {} as Record<string, boolean>,
  });

  if (!enabled) {
    return (
      <>
        {sections.map((sec) => (
          <div key={sec.id} className="mt-3 first:mt-0">
            <MarkdownBody content={`## ${sec.title}\n\n${sec.body}`} />
          </div>
        ))}
      </>
    );
  }

  return (
    <div className="space-y-2">
      {sections.map((sec) => {
        const open = !ui.collapsed[sec.id];
        return (
          <div
            key={sec.id}
            className="overflow-hidden rounded-lg border border-gray-200/80 bg-white/60 dark:border-white/[0.07] dark:bg-black/20"
          >
            <button
              type="button"
              onClick={() =>
                setUi((prev) => ({
                  collapsed: {
                    ...prev.collapsed,
                    [sec.id]: !prev.collapsed[sec.id],
                  },
                }))
              }
              aria-expanded={open}
              className="flex w-full items-center gap-2 px-3 py-2 text-left"
            >
              <span className="min-w-0 flex-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {sec.title}
              </span>
              <ChevronDown
                className={`size-4 shrink-0 text-indigo-500/70 transition-transform duration-200 ease-out dark:text-indigo-300/60 ${
                  open ? "rotate-0" : "-rotate-90"
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
                <div className="border-t border-gray-200/80 px-3 py-2.5 dark:border-white/[0.06]">
                  <MarkdownBody content={sec.body || "_내용 없음_"} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

type SaveFormat = "md" | "txt" | "pdf";

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripInlineMd(raw: string): string {
  return raw
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "$1 ($2)")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(^|[^*])\*(?!\*)(.+?)\*(?!\*)/g, "$1$2")
    .replace(/^#{1,6}\s+/, "")
    .trim();
}

type SimpleBrief = {
  date: string;
  schedule: string[];
  todos: string[];
};

function normalizeLabel(text: string): string {
  return text.replace(/^#{1,6}\s+/, "").replace(/[*_`]/g, "").replace(/[:：]\s*$/, "").trim();
}

function isNoiseItem(text: string): boolean {
  return /예시\s*데이터|example\s*data|현재\s*예시/i.test(text);
}

function isScheduleLabel(text: string): boolean {
  const t = normalizeLabel(text);
  return /^(주요\s*)?일정$|주요\s*일정|오늘\s*일정|스케줄|^schedule$/i.test(t);
}

function isTodoLabel(text: string): boolean {
  const t = normalizeLabel(text);
  return /오늘(?:의)?\s*할\s*일|^할\s*일$|액션(\s*아이템)?|^action(s)?$|^todos?$/i.test(
    t
  );
}

/** 채팅 문장·중복 제목을 버리고 날짜 / 주요 일정 / 할 일만 뽑는다 */
function extractSimpleBrief(markdown: string, fallbackDate: string): SimpleBrief {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let date = fallbackDate;
  let mode: "none" | "schedule" | "todos" = "none";
  const schedule: string[] = [];
  const todos: string[] = [];
  const orphanLists: string[][] = [];
  let orphan: string[] | null = null;

  const flushOrphan = () => {
    if (orphan && orphan.length > 0) orphanLists.push(orphan);
    orphan = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("```")) {
      if (!line) flushOrphan();
      continue;
    }

    const dateOnly = line.match(
      /\d{4}년\s*\d{1,2}월\s*\d{1,2}일(?:\s*(?:요일|[월화수목금토일]))?/
    );
    if (
      dateOnly &&
      !/^[-*•]\s/.test(line) &&
      !/^\d+[.)]\s/.test(line) &&
      !isScheduleLabel(line) &&
      !isTodoLabel(line)
    ) {
      // "2026년 8월 13일 목요일" 전체 줄이 날짜면 그대로 사용
      date = stripInlineMd(line).replace(/\s+/g, " ").trim();
      continue;
    }

    if (isScheduleLabel(line)) {
      flushOrphan();
      mode = "schedule";
      continue;
    }
    if (isTodoLabel(line)) {
      flushOrphan();
      mode = "todos";
      continue;
    }

    if (/^#{1,6}\s+/.test(line)) {
      flushOrphan();
      mode = "none";
      continue;
    }

    const bullet =
      /^[-*•]\s+(.+)$/.exec(line) ?? /^\d+[.)]\s+(.+)$/.exec(line);
    if (bullet) {
      const item = stripInlineMd(bullet[1]!);
      if (!item || isNoiseItem(item)) continue;
      if (mode === "schedule") schedule.push(item);
      else if (mode === "todos") todos.push(item);
      else {
        if (!orphan) orphan = [];
        orphan.push(item);
      }
      continue;
    }

    // 채팅형 서문·설명 문장은 저장에서 제외
    flushOrphan();
    if (mode !== "schedule" && mode !== "todos") mode = "none";
  }
  flushOrphan();

  let finalSchedule = schedule;
  let finalTodos = todos;
  if (finalSchedule.length === 0 && finalTodos.length === 0 && orphanLists.length > 0) {
    finalSchedule = orphanLists[0] ?? [];
    finalTodos = orphanLists[1] ?? [];
  }

  const uniq = (items: string[]) => [...new Set(items)];
  return {
    date,
    schedule: uniq(finalSchedule),
    todos: uniq(finalTodos),
  };
}

function listOrDash(items: string[], bullet: string): string[] {
  if (items.length === 0) return [`${bullet} (없음)`];
  return items.map((item) => `${bullet} ${item}`);
}

function formatBriefTxt(brief: SimpleBrief): string {
  return [
    `날짜: ${brief.date}`,
    "",
    "주요 일정",
    ...listOrDash(brief.schedule, "•"),
    "",
    "오늘의 할 일",
    ...listOrDash(brief.todos, "•"),
    "",
  ].join("\n");
}

function formatBriefMarkdown(brief: SimpleBrief): string {
  return [
    `## 날짜`,
    brief.date,
    "",
    `## 주요 일정`,
    ...listOrDash(brief.schedule, "-"),
    "",
    `## 오늘의 할 일`,
    ...listOrDash(brief.todos, "-"),
    "",
  ].join("\n");
}

function formatBriefPrintHtml(brief: SimpleBrief): string {
  const li = (items: string[]) =>
    (items.length === 0 ? ["(없음)"] : items)
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("");
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>오늘 업무 브리핑</title>
  <style>
    body {
      font-family: "Malgun Gothic", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif;
      margin: 0; color: #111; background: #fff; line-height: 1.55; font-size: 14px;
    }
    .sheet { max-width: 640px; margin: 0 auto; padding: 2rem 1.75rem 2.5rem; }
    .date { font-size: 1.05rem; font-weight: 700; margin: 0 0 1.25rem; color: #0f172a; }
    h2 {
      font-size: 0.95rem; margin: 1.25rem 0 0.5rem; padding-bottom: 0.35rem;
      border-bottom: 1px solid #e2e8f0; color: #0f172a;
    }
    ul { margin: 0; padding-left: 1.2rem; color: #334155; }
    li { margin: 0.35rem 0; }
    @media print { .sheet { padding: 0; max-width: none; } }
  </style>
</head>
<body>
  <article class="sheet">
    <p class="date">날짜: ${escapeHtml(brief.date)}</p>
    <h2>주요 일정</h2>
    <ul>${li(brief.schedule)}</ul>
    <h2>오늘의 할 일</h2>
    <ul>${li(brief.todos)}</ul>
  </article>
  <script>
    window.addEventListener("load", function () {
      setTimeout(function () { window.focus(); window.print(); }, 200);
    });
  </script>
</body>
</html>`;
}

function downloadBlobFile(
  content: string,
  basename: string,
  ext: "md" | "txt",
  mime: string
) {
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `${basename}-${stamp}.${ext}`;
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return filename;
}

/** blob URL로 문서 탭을 열어 인쇄 → PDF 저장 (빈 about:blank 방지) */
function saveAsPrintPdf(brief: SimpleBrief) {
  const html = formatBriefPrintHtml(brief);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) {
    URL.revokeObjectURL(url);
    throw new Error("팝업이 차단되어 PDF 창을 열 수 없습니다.");
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function saveDocumentAs(markdown: string, basename: string, format: SaveFormat) {
  const fallbackDate = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
  const brief = extractSimpleBrief(markdown, fallbackDate);
  if (format === "md") {
    return downloadBlobFile(
      formatBriefMarkdown(brief),
      basename,
      "md",
      "text/markdown"
    );
  }
  if (format === "txt") {
    return downloadBlobFile(formatBriefTxt(brief), basename, "txt", "text/plain");
  }
  saveAsPrintPdf(brief);
  return `${basename}.pdf`;
}

function ActionBar({
  text,
  basename,
  onRegenerate,
}: {
  text: string;
  basename: string;
  onRegenerate?: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [ui, setUi] = useState({
    copied: false,
    saved: false,
    regenerating: false,
    saveMenuOpen: false,
  });

  useEffect(() => {
    if (!ui.saveMenuOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUi((prev) => ({ ...prev, saveMenuOpen: false }));
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [ui.saveMenuOpen]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setUi((prev) => ({ ...prev, copied: true }));
      window.setTimeout(
        () => setUi((prev) => ({ ...prev, copied: false })),
        1600
      );
    } catch {
      /* ignore */
    }
  };

  const save = (format: SaveFormat) => {
    try {
      saveDocumentAs(text, basename, format);
      setUi((prev) => ({ ...prev, saved: true, saveMenuOpen: false }));
      window.setTimeout(
        () => setUi((prev) => ({ ...prev, saved: false })),
        1800
      );
    } catch {
      setUi((prev) => ({ ...prev, saveMenuOpen: false }));
    }
  };

  const regenerate = () => {
    if (!onRegenerate || ui.regenerating) return;
    setUi((prev) => ({ ...prev, regenerating: true }));
    try {
      onRegenerate();
    } finally {
      window.setTimeout(
        () => setUi((prev) => ({ ...prev, regenerating: false })),
        800
      );
    }
  };

  const btn =
    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-indigo-700/80 hover:bg-indigo-500/10 hover:text-indigo-900 dark:text-indigo-200/80 dark:hover:bg-white/5 dark:hover:text-indigo-100";

  const menuItem =
    "block w-full px-3 py-2 text-left text-[11px] text-indigo-100/90 hover:bg-white/10";

  return (
    <div className="mt-2 flex flex-wrap items-center gap-0.5 opacity-100">
      <button type="button" onClick={() => void copy()} className={btn} title="복사">
        {ui.copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
        {ui.copied ? "복사됨" : "복사"}
      </button>
      {onRegenerate ? (
        <button
          type="button"
          onClick={regenerate}
          className={btn}
          title="다시 생성"
          disabled={ui.regenerating}
        >
          <RefreshCw className={`size-3.5 ${ui.regenerating ? "animate-spin" : ""}`} />
          {ui.regenerating ? "생성 중…" : "다시 생성"}
        </button>
      ) : null}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() =>
            setUi((prev) => ({ ...prev, saveMenuOpen: !prev.saveMenuOpen }))
          }
          className={btn}
          title="저장 형식 선택"
          aria-expanded={ui.saveMenuOpen}
          aria-haspopup="menu"
        >
          {ui.saved ? (
            <Check className="size-3.5 text-emerald-400" />
          ) : (
            <FileText className="size-3.5" />
          )}
          {ui.saved ? "저장됨" : "문서로 저장"}
          <ChevronDown className="size-3 opacity-70" aria-hidden />
        </button>
        {ui.saveMenuOpen ? (
          <div
            role="menu"
            className="absolute bottom-full left-0 z-30 mb-1 min-w-[11rem] overflow-hidden rounded-lg border border-white/10 bg-[rgba(12,12,18,0.98)] py-1 shadow-lg"
          >
            <button type="button" role="menuitem" className={menuItem} onClick={() => save("md")}>
              Markdown (.md)
            </button>
            <button type="button" role="menuitem" className={menuItem} onClick={() => save("txt")}>
              텍스트 / 메모장 (.txt)
            </button>
            <button type="button" role="menuitem" className={menuItem} onClick={() => save("pdf")}>
              PDF (인쇄 저장)
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Agent assistant bubble body — summary header, styled markdown, optional section collapse, actions.
 */
export function AgentMessageContent({
  text,
  streaming = false,
  className = "",
  onRegenerate,
  kind: kindProp,
}: AgentMessageContentProps) {
  const displayText = useMemo(
    () =>
      (kindProp ?? inferKind(text)) === "briefing"
        ? ensureTodayDateInBriefing(stripBriefingTitleHeading(text))
        : text,
    [kindProp, text]
  );
  const kind = useMemo(
    () => kindProp ?? inferKind(displayText),
    [kindProp, displayText]
  );
  const summary = useMemo(() => summarize(kind, displayText), [kind, displayText]);
  const parsed = useMemo(() => splitByH2(displayText), [displayText]);
  const collapsible = parsed.sections.length >= 3;
  const Icon = summary.Icon;
  const basename =
    kind === "report" ? "moneo-weekly-report" : "moneo-briefing";

  return (
    <div className={`group/msg ${className}`}>
      <div className="mb-2.5 flex items-start gap-2 border-b border-gray-200/80 pb-2 dark:border-white/[0.07]">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-indigo-400/30 bg-indigo-500/10 text-indigo-700 dark:border-indigo-400/25 dark:bg-indigo-500/15 dark:text-indigo-200">
          <Icon className="size-3.5" aria-hidden />
        </span>
        <p className="min-w-0 pt-0.5 text-xs font-medium leading-snug text-indigo-900/80 dark:text-indigo-100/85">
          {summary.label}
        </p>
      </div>

      {parsed.intro ? <MarkdownBody content={parsed.intro} /> : null}

      {parsed.sections.length > 0 ? (
        <div className={parsed.intro ? "mt-2" : undefined}>
          <SectionAccordion sections={parsed.sections} enabled={collapsible} />
        </div>
      ) : !parsed.intro ? (
        <MarkdownBody content={displayText} />
      ) : null}

      {streaming ? (
        <span className="mt-1 inline-flex items-center gap-1" aria-label="응답 생성 중">
          <span className="size-1 animate-pulse rounded-full bg-indigo-400/80 [animation-delay:0ms]" />
          <span className="size-1 animate-pulse rounded-full bg-indigo-400/80 [animation-delay:150ms]" />
          <span className="size-1 animate-pulse rounded-full bg-indigo-400/80 [animation-delay:300ms]" />
        </span>
      ) : null}

      {!streaming ? (
        <ActionBar text={displayText} basename={basename} onRegenerate={onRegenerate} />
      ) : null}
    </div>
  );
}

export function AgentStreamingPlaceholder() {
  return (
    <div className="w-fit max-w-full rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-2 flex items-center gap-2 text-xs text-indigo-700/80 dark:text-indigo-200/70">
        <Sparkles className="size-3.5 animate-pulse text-indigo-500 dark:text-indigo-300" />
        업무 맥락을 정리하는 중…
      </div>
      <div className="flex items-center gap-1.5">
        <span className="size-1.5 animate-pulse rounded-full bg-indigo-400 [animation-delay:0ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-indigo-400 [animation-delay:150ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-indigo-400 [animation-delay:300ms]" />
        <span className="ml-1 inline-block h-3.5 w-0.5 animate-pulse bg-indigo-400/80" />
      </div>
    </div>
  );
}
