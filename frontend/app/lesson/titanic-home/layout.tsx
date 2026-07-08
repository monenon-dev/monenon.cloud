import { LessonTitanicShell } from "@/components/lesson/lesson-titanic-shell";

export default function TitanicHomeLayout({ children }: { children: React.ReactNode }) {
  return <LessonTitanicShell>{children}</LessonTitanicShell>;
}
