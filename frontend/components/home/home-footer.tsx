import Link from "next/link";

const SHELL = "mx-auto w-full max-w-6xl xl:max-w-7xl px-4 sm:px-6 lg:px-8";

export function HomeFooter() {
  return (
    <footer className="border-t border-white/[0.08]" aria-label="사이트 푸터">
      <div className={`${SHELL} py-6 sm:py-8`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/"
              className="text-base font-semibold tracking-tight text-white transition-opacity hover:opacity-90"
            >
              Moneo
            </Link>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-[var(--moneo-muted)] sm:text-sm">
              AI Agents, Orchestrated for Work
            </p>
          </div>
          <p className="text-xs text-[var(--moneo-muted)]/75">© 2026 Moneo</p>
        </div>
      </div>
    </footer>
  );
}
