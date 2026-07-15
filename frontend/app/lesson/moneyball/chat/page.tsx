"use client";

import Link from "next/link";

import { GeminiChatPanel } from "@/components/chat/gemini-chat-panel";
import { LessonLayout } from "@/components/lesson/lesson-layout";
import { getApiBaseUrl } from "@/lib/api-base";
import { routes } from "@/lib/routes";

export default function MoneyballChatPage() {
  const apiBase = getApiBaseUrl().replace(/\/$/, "");

  return (
    <LessonLayout active="moneyball">
      <div className="flex min-h-[calc(100vh-3.5rem)] flex-col px-4 py-8 sm:px-8 lg:px-12">
        <div className="mb-6 max-w-3xl">
          <p className="font-mono text-[11px] font-semibold tracking-[0.22em] text-indigo-300/70">
            MONEYBALL · SOVEREIGN
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
            K-League DB 채팅 (스타 온톨로지)
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[var(--moneo-muted)]">
            허브 EXAONE 7.8B가 스포크를 고르고, 스포크 2.4B가 SQL을 만든 뒤 DB 결과만으로
            답합니다. Ollama 미기동 시에도 heuristic 모드로 동일 파이프라인이 동작합니다.
          </p>
          <p className="mt-2 text-xs text-[var(--moneo-muted)]">
            <Link href={routes.lesson.moneyball} className="text-indigo-300 hover:underline">
              더미 데이터 시드
            </Link>
            를 먼저 실행해 두세요.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-[var(--moneo-border)] bg-[var(--moneo-bg-elevated)] moneo-glass">
          <GeminiChatPanel
            apiBaseUrl={apiBase}
            chatPath="/api/moneyball/chat"
            placeholder="예: 전북 홈구장은? / 울산 소속 선수 / 포항 최근 경기 스코어"
            emptyTitle="Moneyball에게 물어보세요"
            emptySubtitle="축구 DB(경기장·팀·선수·일정)에 있는 사실만 답합니다."
            className="h-full min-h-[28rem]"
          />
        </div>
      </div>
    </LessonLayout>
  );
}
