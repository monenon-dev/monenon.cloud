"use client";

import Link from "next/link";

import { routes } from "@/lib/routes";
import { useEffect, useState } from "react";

import { GeminiChatPanel, type GeminiChatMessage } from "@/components/chat/gemini-chat-panel";
import { getTitanicApiBaseUrl } from "@/lib/api-base";

type SmithProfile = {
  id: number;
  name: string;
};

const WELCOME_MESSAGE: GeminiChatMessage = {
  role: "assistant",
  text: "안녕하십니까. RMS 타이타닉의 스미스 선장입니다. 승객 명단, 생존, 침몰과 관련된 질문만 받겠습니다.",
  ts: "",
};

export default function SmithCaptainChatPage() {
  const apiBaseUrl = getTitanicApiBaseUrl();
  const [profile, setProfile] = useState<SmithProfile | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/titanic/smith/myself`);
        if (!res.ok) return;
        const data = (await res.json()) as SmithProfile;
        setProfile(data);
      } catch {
        setProfile(null);
      }
    })();
  }, [apiBaseUrl]);

  return (
    <div className="px-6 py-14 sm:px-10 lg:px-14">
      <p className="text-[11px] font-semibold tracking-widest text-gray-400">LESSON</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">3. 스미스 선장 채팅</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
        {profile?.name ?? "Captain Edward John Smith"}와 대화합니다. Lesson 데이터 관련 질문만 답합니다.
      </p>
      <div className="mt-4 text-xs">
        <Link href={routes.lesson.titanicHome} className="text-indigo-600 hover:underline">
          ← 1. 데이터 수집
        </Link>
      </div>

      <section className="mt-8 min-h-[520px]">
        <GeminiChatPanel
          className="min-h-[520px]"
          placeholder="타이타닉에 대해 질문하세요 (예: 생존자는 몇 명인가요?)"
          initialMessages={[WELCOME_MESSAGE]}
        />
      </section>
    </div>
  );
}
