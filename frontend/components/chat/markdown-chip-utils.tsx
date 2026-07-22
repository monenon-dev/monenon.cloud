import {
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

/** Private-use sentinels — survive markdown parse, restored after chip split. */
const ESC_LB = "\uE000";
const ESC_RB = "\uE001";

const CHIP_CLASS =
  "mx-0.5 inline-flex max-w-full items-center rounded-md border border-indigo-400/25 bg-indigo-500/10 px-1.5 py-0.5 align-baseline font-mono text-[11px] text-indigo-800 dark:border-indigo-400/20 dark:bg-indigo-500/15 dark:text-indigo-100";

/**
 * Protect `\[` / `\]` so CommonMark consumes them as literal brackets
 * without leaving visible backslashes, and so we do not turn them into chips.
 */
export function preserveEscapedBrackets(markdown: string): string {
  return markdown.replace(/\\\[/g, ESC_LB).replace(/\\\]/g, ESC_RB);
}

function restoreEscapes(text: string): string {
  return text.split(ESC_LB).join("[").split(ESC_RB).join("]");
}

function Chip({ label }: { label: string }) {
  return <span className={CHIP_CLASS}>{label}</span>;
}
Chip.displayName = "MdChip";

/**
 * Split a text node into plain text + chips.
 * Matches `[label]` only — escaped brackets are already sentinels.
 */
export function splitTextWithChips(
  text: string,
  keyPrefix: string
): ReactNode[] {
  const re = /\[([^\]\n\uE000\uE001]+)\]/g;
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(restoreEscapes(text.slice(last, m.index)));
    }
    nodes.push(<Chip key={`${keyPrefix}-chip-${i++}`} label={m[1]!} />);
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    nodes.push(restoreEscapes(text.slice(last)));
  }
  if (nodes.length === 0) {
    nodes.push(restoreEscapes(text));
  }
  return nodes;
}

function isStrongLike(node: ReactNode): boolean {
  if (!isValidElement(node)) return false;
  const t = node.type;
  if (t === "strong" || t === "b") return true;
  if (typeof t === "function" || typeof t === "object") {
    const name =
      (t as { displayName?: string; name?: string }).displayName ??
      (t as { name?: string }).name;
    return name === "strong" || name === "Strong" || name === "MdStrong";
  }
  return false;
}

function isSkipChipWalk(el: ReactElement): boolean {
  const t = el.type;
  if (t === "code" || t === "pre" || t === "a" || t === Chip) return true;
  if (typeof t === "function" || typeof t === "object") {
    const name =
      (t as { displayName?: string; name?: string }).displayName ??
      (t as { name?: string }).name;
    if (
      name === "code" ||
      name === "pre" ||
      name === "a" ||
      name === "Code" ||
      name === "Pre" ||
      name === "A" ||
      name === "MdChip"
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Walk React children from react-markdown: chip-ify string text nodes only.
 * Ensures a space between a preceding <strong> and a chip that starts immediately.
 */
export function injectChipsInChildren(
  children: ReactNode,
  keyPrefix = "md"
): ReactNode {
  const arr = Children.toArray(children);
  const out: ReactNode[] = [];

  arr.forEach((child, idx) => {
    if (typeof child === "string") {
      let parts = splitTextWithChips(child, `${keyPrefix}-${idx}`);
      const first = parts[0];
      const startsWithChip =
        isValidElement(first) &&
        first.type === Chip;
      if (startsWithChip && isStrongLike(out[out.length - 1])) {
        parts = [" ", ...parts];
      }
      // Collapse accidental double spaces only at join points — keep single leading space
      out.push(...parts);
      return;
    }
    if (typeof child === "number") {
      out.push(child);
      return;
    }
    if (!isValidElement(child)) {
      out.push(child);
      return;
    }
    if (isSkipChipWalk(child)) {
      out.push(child);
      return;
    }
    const props = child.props as { children?: ReactNode };
    if (props.children == null) {
      out.push(child);
      return;
    }
    out.push(
      cloneElement(child, {
        ...props,
        children: injectChipsInChildren(
          props.children,
          `${keyPrefix}-${idx}`
        ),
      } as never)
    );
  });

  return out.length === 1 ? out[0] : out;
}

/** Regression fixture — lists, escaped brackets, bold+chip adjacency. */
export const MARKDOWN_REGRESSION_FIXTURE = `## 일정 브리핑

오늘 오전 기준으로 액션을 정리했습니다.

* **Standup** [Core]
* Design sync
* Investor prep

### 문서

문서:**\\[프로젝트명\\]** 은 예시 표기이고, 실제 인용은 **문서** [q3-roadmap.md] 입니다.

중첩 목록:

* Ops
  * [ops-alerts.md]
  * 인시던트 런북
* Product
  * UX 가이드
`;
