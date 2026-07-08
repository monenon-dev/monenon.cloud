import { LessonLayout } from "@/components/lesson/lesson-layout";

export default function SamsungLessonLayout({ children }: { children: React.ReactNode }) {
  return <LessonLayout active="samsung">{children}</LessonLayout>;
}
