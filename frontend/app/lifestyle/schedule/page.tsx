"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";

import { ManagementNav } from "@/components/mail-schedule/management-nav";
import { GeminiScheduleChat } from "@/components/schedule/gemini-schedule-chat";

export default function SchedulePage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            Monenon AI Agent
          </Link>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 flex items-center justify-center gap-2">
            <CalendarDays className="size-4" aria-hidden />
            n8n · Google Calendar 일정 등록
          </p>
        </div>

        <ManagementNav />

        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/40 p-6 shadow-sm">
          <GeminiScheduleChat />
        </div>

        <p className="text-center mt-6">
          <Link
            href="/"
            className="text-sm text-gray-500 dark:text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
          >
            ← 홈으로
          </Link>
        </p>
      </div>
    </main>
  );
}
