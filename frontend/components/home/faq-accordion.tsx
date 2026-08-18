"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

import { routes } from "@/lib/routes";

type FaqItem = {
  q: string;
  a: ReactNode;
};

type FaqCategory = {
  title: string;
  items: FaqItem[];
};

const FAQ_CATEGORIES: FaqCategory[] = [
  {
    title: "서비스 소개",
    items: [
      {
        q: "Moneo는 어떤 서비스인가요?",
        a: (
          <>
            Moneo는 카카오 톡캘린더와 Gmail을 연결해 매일 아침 업무 브리핑을 자동으로 만들어 주는 AI 라이프 어시스턴트입니다.
            연결된 데이터만 모아 브리핑·알림·주간 리포트를 생성하고, 채팅으로도 언제든 조회할 수 있습니다.
            {" "}
            <Link href={routes.about} className="inline-link">기능 소개 →</Link>
          </>
        ),
      },
      {
        q: "무료로 쓸 수 있나요?",
        a: (
          <>
            현재는 수업·테스트 목적으로 운영 중이며, 별도 요금 없이 이용할 수 있습니다.
            서비스 구조나 요금 정책이 바뀌면 사전에 안내할 예정입니다.
          </>
        ),
      },
    ],
  },
  {
    title: "브리핑 · 리포트",
    items: [
      {
        q: "브리핑은 언제 만들어지나요?",
        a: (
          <>
            마이페이지 알림 설정에서 지정한 시각(기본 오전 7:00)에 자동으로 생성됩니다.
            채팅에서 &ldquo;오늘 브리핑 보여줘&rdquo;라고 입력하면 언제든 다시 확인할 수 있습니다.
            {" "}
            <Link href={routes.oauth.mypageNotifications} className="inline-link">발송 시각 설정 →</Link>
          </>
        ),
      },
      {
        q: "연동을 안 하면 브리핑이 비어있나요?",
        a: (
          <>
            연동 없이도 브리핑은 생성되지만, 연결되지 않은 소스(캘린더·Gmail)는 자동으로 건너뜁니다.
            연동한 항목이 많을수록 브리핑 내용도 풍부해집니다.
            브리핑을 이메일로 받으려면 Gmail 연동이 필요합니다.
          </>
        ),
      },
      {
        q: "주간 리포트는 어떻게 받아볼 수 있나요?",
        a: (
          <>
            지금은 채팅에서 &ldquo;이번 주 리포트 요약해 줘&rdquo;라고 요청하거나, 홈의 주간 리포트 체험 위젯에서 직접 생성할 수 있습니다.
            최근 7일간의 일일 브리핑을 모아 자동으로 작성되며, 지연·미완료가 반복되면 리스크로 표시됩니다.
            매주 금요일 자동 발송과 히스토리 저장은 준비 중입니다.
            {" "}
            <Link href={routes.lifestyle.chats} className="inline-link">채팅에서 요청하기 →</Link>
          </>
        ),
      },
    ],
  },
  {
    title: "연동",
    items: [
      {
        q: "어떤 서비스와 연동할 수 있나요?",
        a: (
          <>
            현재 연동 가능한 서비스는 <strong className="text-indigo-300">Gmail</strong>과{" "}
            <strong className="text-indigo-300">카카오 톡캘린더</strong>입니다.
            Gmail은 브리핑 발송과 상황 감지 알림에 사용되고, 카카오 톡캘린더는 일정 정보를 브리핑에 반영합니다.
            {" "}
            <Link href={routes.oauth.mypageNotifications} className="inline-link">연동 설정 →</Link>
          </>
        ),
      },
      {
        q: "연동을 나중에 취소할 수 있나요?",
        a: (
          <>
            네, 마이페이지 알림 설정에서 언제든 연동을 끌 수 있습니다.
            Gmail은 비활성화하면 토큰이 해제되고, 다시 사용하려면 OAuth를 재연결해야 합니다.
            카카오 톡캘린더는 동기화 토글을 끄면 일정 연동이 중단됩니다.
            {" "}
            <Link href={routes.oauth.mypageNotifications} className="inline-link">연동 관리 →</Link>
          </>
        ),
      },
    ],
  },
  {
    title: "상황 감지 알림",
    items: [
      {
        q: "알림은 언제, 어떻게 오나요?",
        a: (
          <>
            기본 오전 8시~오후 8시 사이에 30분 간격으로 상황을 점검합니다.
            향후 3시간 일정이 밀리거나 Gmail 마감 메일이 감지되면 앱 알림과 함께 Gmail로 즉시 발송됩니다.
            같은 감지 내용은 24시간 내 중복 발송하지 않습니다.
            {" "}
            <Link href={routes.oauth.mypageNotifications} className="inline-link">알림 설정 →</Link>
          </>
        ),
      },
      {
        q: "알림이 너무 자주 오면 어떻게 조절하나요?",
        a: (
          <>
            마이페이지 알림 설정에서 활성 시간대(기본 08–20시)와 일정 밀집 민감도(2·3·4건 중 선택)를 조절할 수 있습니다.
            일정 밀집 감지나 긴급 메시지 감지를 각각 켜고 끌 수도 있습니다.
            {" "}
            <Link href={routes.oauth.mypageNotifications} className="inline-link">알림 설정 조절 →</Link>
          </>
        ),
      },
    ],
  },
  {
    title: "채팅",
    items: [
      {
        q: "업무 말고 일반적인 것도 물어볼 수 있나요?",
        a: (
          <>
            네. 브리핑·리포트 요청이 아닌 일반 질문도 사용자 맥락을 참고해 Gemini가 답합니다.
            브리핑·리포트 관련 의도가 감지되면 해당 데이터를 불러와 답하고, 그 외에는 일반 대화로 이어집니다.
            {" "}
            <Link href={routes.lifestyle.chats} className="inline-link">채팅 바로가기 →</Link>
          </>
        ),
      },
      {
        q: "대화 기록은 저장되나요?",
        a: (
          <>
            로그인한 상태에서는 대화 세션이 저장되어 이전 기록을 이어볼 수 있습니다.
            비로그인 상태에서는 기록이 남지 않습니다.
          </>
        ),
      },
    ],
  },
  {
    title: "계정",
    items: [
      {
        q: "로그인은 어떻게 하나요?",
        a: (
          <>
            이메일·비밀번호로 직접 로그인하거나, Google·Naver·Kakao 소셜 계정으로 로그인할 수 있습니다.
            아직 계정이 없다면 회원가입 후 이용할 수 있습니다.
            {" "}
            <Link href={routes.oauth.login} className="inline-link">로그인 →</Link>
          </>
        ),
      },
      {
        q: "회원 탈퇴는 어떻게 하나요?",
        a: (
          <>
            현재 사용자가 직접 탈퇴하는 기능은 준비 중입니다.
            탈퇴가 필요한 경우 채팅 또는 관리자에게 문의해 주시면 처리해 드립니다.
          </>
        ),
      },
    ],
  },
];

function AccordionItem({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-white/10 last:border-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-medium text-gray-100 sm:text-base">{item.q}</span>
        <ChevronDown
          size={18}
          className={`mt-0.5 shrink-0 text-indigo-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open && (
        <div className="pb-5 pr-6 text-sm leading-relaxed text-[var(--moneo-muted)] sm:text-base [&_.inline-link]:text-indigo-300 [&_.inline-link]:underline-offset-2 [&_.inline-link:hover]:text-indigo-200 [&_.inline-link:hover]:underline">
          {item.a}
        </div>
      )}
    </div>
  );
}

export function FaqAccordion() {
  return (
    <div className="space-y-10 sm:space-y-12">
      {FAQ_CATEGORIES.map((cat) => (
        <section key={cat.title} aria-labelledby={`faq-cat-${cat.title}`}>
          <h2
            id={`faq-cat-${cat.title}`}
            className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400/80"
          >
            {cat.title}
          </h2>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 sm:px-6">
            {cat.items.map((item) => (
              <AccordionItem key={item.q} item={item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
