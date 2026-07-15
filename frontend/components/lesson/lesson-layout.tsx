import { LessonHeader } from "@/components/lesson/lesson-header";
import { LessonSidebar } from "@/components/lesson/lesson-sidebar";

type LessonNavKey = "hub" | "titanic" | "samsung" | "moneyball";

export function LessonLayout({
  children,
  active = "hub",
}: {
  children: React.ReactNode;
  active?: LessonNavKey;
}) {
  return (
    <div className="relative min-h-dvh moneo-grid-bg text-[var(--moneo-text)]">
      <div className="moneo-noise pointer-events-none absolute inset-0 -z-10" aria-hidden />
      <LessonHeader active={active} />
      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-6xl">
        <div className="hidden w-56 shrink-0 border-r border-[var(--moneo-border)] md:block lg:w-64">
          <LessonSidebar active={active} />
        </div>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
