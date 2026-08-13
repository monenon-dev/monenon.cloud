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
    <div className="agent-md text-sm">
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

/** 브라우저 인쇄 → 「PDF로 저장」 선택 (한글 깨짐 없는 방식) */
function saveAsPrintPdf(text: string, title: string) {
  const w = window.open("", "_blank", "noopener,noreferrer,width=840,height=900");
  if (!w) {
    throw new Error("팝업이 차단되어 PDF 창을 열 수 없습니다.");
  }
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  w.document.write(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${title.replace(/</g, "")}</title>
  <style>
    body { font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
           margin: 2rem; color: #111; line-height: 1.55; font-size: 14px; }
    h1 { font-size: 1.15rem; margin: 0 0 1rem; }
    pre { white-space: pre-wrap; word-break: break-word; font-family: inherit; margin: 0; }
    @media print { body { margin: 1.2cm; } }
  </style>
</head>
<body>
  <h1>${title.replace(/</g, "")}</h1>
  <pre>${escaped}</pre>
  <script>
    window.onload = function () {
      window.focus();
      window.print();
    };
  </script>
</body>
</html>`);
  w.document.close();
}

function saveDocumentAs(text: string, basename: string, format: SaveFormat) {
  if (format === "md") {
    return downloadBlobFile(text, basename, "md", "text/markdown");
  }
  if (format === "txt") {
    return downloadBlobFile(text, basename, "txt", "text/plain");
  }
  saveAsPrintPdf(text, basename);
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
  const kind = useMemo(
    () => kindProp ?? inferKind(text),
    [kindProp, text]
  );
  const summary = useMemo(() => summarize(kind, text), [kind, text]);
  const parsed = useMemo(() => splitByH2(text), [text]);
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
        <MarkdownBody content={text} />
      ) : null}

      {streaming ? (
        <span className="mt-1 inline-flex items-center gap-1" aria-label="응답 생성 중">
          <span className="size-1 animate-pulse rounded-full bg-indigo-400/80 [animation-delay:0ms]" />
          <span className="size-1 animate-pulse rounded-full bg-indigo-400/80 [animation-delay:150ms]" />
          <span className="size-1 animate-pulse rounded-full bg-indigo-400/80 [animation-delay:300ms]" />
        </span>
      ) : null}

      {!streaming ? (
        <ActionBar text={text} basename={basename} onRegenerate={onRegenerate} />
      ) : null}
    </div>
  );
}

export function AgentStreamingPlaceholder() {
  return (
    <div className="max-w-[min(100%,42rem)] sm:max-w-[85%] rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
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
