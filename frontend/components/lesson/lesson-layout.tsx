import { LessonHeader } from "@/components/lesson/lesson-header";
import { LessonSidebar } from "@/components/lesson/lesson-sidebar";

type LessonNavKey = "hub" | "titanic" | "crawling" | "samsung";

export function LessonLayout({
  children,
  active = "hub",
}: {
  children: React.ReactNode;
  active?: LessonNavKey;
}) {
  return (
    <div className="min-h-dvh bg-white text-gray-900">
      <LessonHeader active={active} />
      <div className="mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-6xl">
        <div className="hidden w-56 shrink-0 md:block lg:w-64">
          <LessonSidebar active={active} />
        </div>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
