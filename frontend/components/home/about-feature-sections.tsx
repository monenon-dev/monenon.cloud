import Link from "next/link";
import { ImageIcon } from "lucide-react";
import type { ReactNode } from "react";

import { routes } from "@/lib/routes";

type FeatureStatus = "available" | "partial" | "demo" | "coming";

type AboutFeature = {
  id: string;
  title: string;
  status: FeatureStatus;
  pain: string;
  paragraphs: string[];
  footnote?: ReactNode;
  imageFirst: boolean;
  screenshotLabel: string;
};

const STATUS_LABEL: Record<FeatureStatus, string> = {
  available: "지금 사용 가능",
  partial: "일부 제공",
  demo: "체험 예시",
  coming: "준비 중",
};

const STATUS_CLASS: Record<FeatureStatus, string> = {
  available: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200/90",
  partial: "border-amber-400/30 bg-amber-500/10 text-amber-100/90",
  demo: "border-sky-400/30 bg-sky-500/10 text-sky-100/90",
  coming: "border-white/15 bg-white/[0.04] text-gray-400",
};

const ABOUT_FEATURES: AboutFeature[] = [
  {
    id: "briefing",
    title: "오늘의 업무 브리핑",
    status: "available",
    pain:
      "아침마다 캘린더·메신저·메일을 돌아다니며 오늘 손댈 일을 다시 정리하느라, 회의 전 5분이 사라지는 날이 많죠?",
    paragraphs: [
      "설정한 시각에 moneo가 연동된 카카오 캘린더, 최근 대화, Slack, Gmail을 모아 오늘의 브리핑을 만듭니다. 연동하지 않은 항목은 빠지고, 연결된 것만 자연스럽게 반영됩니다.",
      "내보내기 전에 근거 없는 문장은 스스로 걸러내고 다시 다듭니다. 검토 모드를 켜두면 의심되는 문장은 승인·거절 후 확정됩니다.",
      "에이전트 채팅에서 \"오늘 브리핑 다시 보여줘\"라고 해도 같은 내용을 바로 확인할 수 있습니다.",
    ],
    footnote: (
      <>
        발송 시각·Slack/Gmail 알림은{" "}
        <Link
          href={routes.oauth.mypageNotifications}
          className="text-indigo-300 underline-offset-2 hover:text-indigo-200 hover:underline"
        >
          마이페이지 알림 설정
        </Link>
        에서 조절할 수 있습니다. 문서함 연동은 준비 중입니다.
      </>
    ),
    imageFirst: true,
    screenshotLabel: "오늘의 업무 브리핑 화면",
  },
  {
    id: "docs",
    title: "문서·자료 정리",
    status: "demo",
    pain:
      "회의록과 메모가 여기저기 흩어져 있어, 핵심만 뽑고 다음 할 일까지 한 번에 정리하기 어렵죠?",
    paragraphs: [
      "moneo는 붙여넣은 텍스트에서 핵심 요약과 다음 할 일 한 줄을 뽑아내는 기능을 갖추고 있습니다.",
      "지금 홈·데모에서는 동작 예시만 보여 줍니다. 로그인 후 채팅에 붙여넣어 저장하고 이어서 다루는 흐름은 아직 연결 중입니다.",
      "문서함 연동과 팀 공유까지 이어지는 기능은 준비 중입니다.",
    ],
    imageFirst: false,
    screenshotLabel: "문서·자료 정리 예시",
  },
  {
    id: "report",
    title: "업무 리포트 생성",
    status: "partial",
    pain:
      "금요일마다 한 주를 처음부터 다시 쓰려면, 이미 쌓인 브리핑을 또 훑어야 하는 부담이 남죠?",
    paragraphs: [
      "최근 7일간 저장된 일일 브리핑을 모아 주간 리포트를 만듭니다. 지연·미완료 같은 표현이 여러 날 반복되면 리스크로 짚어 줍니다.",
      "지금은 채팅에서 \"이번 주 리포트 요약해 줘\"라고 요청하거나, 로그인 후 홈에서 직접 생성할 수 있습니다.",
      "매주 금요일 자동 발송과 리포트 히스토리 저장은 아직 준비 중입니다.",
    ],
    footnote: (
      <>
        로그인 후{" "}
        <Link
          href={routes.lifestyle.chats}
          className="text-indigo-300 underline-offset-2 hover:text-indigo-200 hover:underline"
        >
          에이전트 채팅
        </Link>
        이나 홈의 주간 리포트 체험에서 바로 요청할 수 있습니다.
      </>
    ),
    imageFirst: true,
    screenshotLabel: "주간 업무 리포트 화면",
  },
  {
    id: "alerts",
    title: "상황 감지형 알림",
    status: "available",
    pain:
      "정해진 아침 알림만으로는, 오후에 몰린 일정이나 급한 메일을 미리 알기 어렵죠?",
    paragraphs: [
      "설정한 시간대(기본 08:00–20:00) 동안 일정 밀집, 일정 겹침, Slack 긴급 멘션, Gmail 마감 키워드 메일을 주기적으로 살핍니다.",
      "문제가 보이면 아침 브리핑을 기다리지 않고 Slack DM·Gmail·앱 내 알림으로 바로 알려 줍니다. 정해진 시각에만 오는 게 아니라, 필요한 순간에 먼저 옵니다.",
      "Slack 또는 Gmail 중 하나 이상을 연동해야 감지·발송이 동작합니다. 일정 밀집 민감도와 알림 시간대는 마이페이지에서 조절할 수 있습니다.",
    ],
    footnote: (
      <>
        홈의 일정 밀집 체험 위젯은 같은 감지 로직을 미리 보여 줍니다. 실제 알림은{" "}
        <Link
          href={routes.oauth.mypageNotifications}
          className="text-indigo-300 underline-offset-2 hover:text-indigo-200 hover:underline"
        >
          알림 설정
        </Link>
        과 연동 후 동작합니다.
      </>
    ),
    imageFirst: false,
    screenshotLabel: "상황 감지형 알림 화면",
  },
  {
    id: "chat",
    title: "대화로 물어보기",
    status: "available",
    pain:
      "브리핑이나 리포트를 보고 싶을 때마다 메뉴를 찾거나, 정해진 알림 시각을 기다릴 필요는 없죠?",
    paragraphs: [
      "에이전트 채팅에 \"오늘 브리핑 다시 보여줘\", \"이번 주 리포트 요약해 줘\"처럼 말하면 의도에 맞는 답을 바로 돌려줍니다.",
      "로그인하면 대화 기록이 저장되고, 일반 업무 질문도 맥락을 반영해 이어갑니다.",
      "정기 알림이 오기 전에, 필요할 때 원하는 순간에 확인할 수 있습니다.",
    ],
    footnote: (
      <>
        <Link
          href={routes.lifestyle.chats}
          className="text-indigo-300 underline-offset-2 hover:text-indigo-200 hover:underline"
        >
          에이전트 채팅
        </Link>
        에서 바로 시작할 수 있습니다.
      </>
    ),
    imageFirst: true,
    screenshotLabel: "에이전트 채팅 화면",
  },
];

function FeatureScreenshotPlaceholder({ label }: { label: string }) {
  return (
    <div
      className="moneo-glass flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/20 bg-white/[0.02] p-6 sm:aspect-video"
      role="img"
      aria-label={`${label} 스크린샷 자리`}
    >
      <div className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-indigo-300/70">
        <ImageIcon className="size-6" aria-hidden />
      </div>
      <p className="text-center text-xs leading-relaxed text-gray-500 sm:text-sm">
        {label}
        <br />
        <span className="text-gray-600">스크린샷을 여기에 추가할 예정</span>
      </p>
    </div>
  );
}

export function AboutFeatureSections() {
  return (
    <div className="space-y-16 sm:space-y-20 lg:space-y-24">
      <div className="max-w-2xl">
        <p className="text-sm leading-relaxed text-[var(--moneo-muted)]">
          아래 내용은 실제로 동작하는 범위만 정리했습니다. 체험 예시·준비 중인 항목은
          배지로 구분해 두었습니다.
        </p>
      </div>

      {ABOUT_FEATURES.map((feature) => (
        <section
          key={feature.id}
          className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16"
          aria-labelledby={`about-feature-${feature.id}`}
        >
          <div className={feature.imageFirst ? "order-1" : "order-1 lg:order-2"}>
            <FeatureScreenshotPlaceholder label={feature.screenshotLabel} />
          </div>

          <div
            className={`min-w-0 ${feature.imageFirst ? "order-2" : "order-2 lg:order-1"}`}
          >
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_CLASS[feature.status]}`}
            >
              {STATUS_LABEL[feature.status]}
            </span>
            <h2
              id={`about-feature-${feature.id}`}
              className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl"
            >
              {feature.title}
            </h2>
            <p className="mt-4 text-sm font-medium text-indigo-300/90 sm:text-base">
              {feature.pain}
            </p>
            <div className="mt-5 space-y-3 text-sm leading-relaxed text-[var(--moneo-muted)] sm:text-base">
              {feature.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            {feature.footnote ? (
              <p className="mt-4 text-xs leading-relaxed text-gray-500 sm:text-sm">
                {feature.footnote}
              </p>
            ) : null}
          </div>
        </section>
      ))}
    </div>
  );
}
