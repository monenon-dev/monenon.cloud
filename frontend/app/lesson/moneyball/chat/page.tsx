"use client";

import { MoneyballChatPanel } from "@/components/lesson/moneyball-chat-panel";
import { LessonLayout } from "@/components/lesson/lesson-layout";

export default function MoneyballChatPage() {
  return (
    <LessonLayout active="moneyball">
      <MoneyballChatPanel className="min-h-[calc(100dvh-3.5rem)]" />
    </LessonLayout>
  );
}
