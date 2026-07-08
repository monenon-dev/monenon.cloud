import { LessonLayout } from "@/components/lesson/lesson-layout";

export default function CrawlingLayout({ children }: { children: React.ReactNode }) {
  return <LessonLayout active="crawling">{children}</LessonLayout>;
}
