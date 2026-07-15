import Link from "next/link";
import { Github } from "lucide-react";

const SHELL = "mx-auto w-full max-w-6xl xl:max-w-7xl px-4 sm:px-6 lg:px-8";
const GITHUB_URL = "https://github.com/monenon-dev/monenon.cloud";

export function HomeFooter() {
  return (
    <footer className="border-t border-white/10" aria-label="사이트 푸터">
      <div className={`${SHELL} py-10 sm:py-12`}>
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-white transition-opacity hover:opacity-90"
            >
              Moneo
            </Link>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--moneo-muted)]">
              AI Agents, Orchestrated for Work
            </p>
          </div>

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-indigo-100/80 transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-white"
            aria-label="GitHub 저장소 열기"
          >
            <Github size={18} aria-hidden />
          </a>
        </div>

        <p className="mt-10 text-xs text-[var(--moneo-muted)]/80">© 2026 Moneo</p>
      </div>
    </footer>
  );
}
