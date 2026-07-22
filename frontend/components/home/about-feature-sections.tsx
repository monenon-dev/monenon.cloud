import { ImageIcon } from "lucide-react";

type AboutFeature = {
  title: string;
  pain: string;
  solution: string[];
  imageFirst: boolean;
};

const ABOUT_FEATURES: AboutFeature[] = [
  {
    title: "오늘의 업무 브리핑",
    pain: "아침마다 캘린더·Slack·메일을 오가며 오늘 할 일을 정리하기 번거로우셨죠?",
    solution: [
      "moneo는 연동된 일정, 최근 대화, 진행 중인 문서를 한 번에 모읍니다.",
      "우선순위와 리스크를 묶어 아침 브리핑 초안을 채팅으로 전달합니다.",
      "회의 전 5분이면 하루 흐름을 파악할 수 있습니다.",
    ],
    imageFirst: true,
  },
  {
    title: "문서·자료 정리",
    pain: "흩어진 노트, 공유 드라이브, 스레드가 쌓여 어디서부터 손대야 할지 막막하셨죠?",
    solution: [
      "moneo는 주제·프로젝트·마감 기준으로 자료를 묶고 중복을 걸러냅니다.",
      "다음에 손댈 작업과 참고 링크를 정리해 드립니다.",
      "팀 공유 전에 한 번에 정리된 요약본을 받을 수 있습니다.",
    ],
    imageFirst: false,
  },
  {
    title: "업무 리포트 생성",
    pain: "주간·월간 보고를 위해 진행 현황을 다시 쓰고 표를 맞추는 데 시간이 많이 드셨죠?",
    solution: [
      "moneo는 진행률, 완료 항목, 리스크, 다음 액션을 리포트 형식으로 조립합니다.",
      "채팅에서 수정 요청을 주면 초안을 바로 다듬습니다.",
      "슬랙이나 메일로 공유하기 좋은 한 페이지 요약을 만듭니다.",
    ],
    imageFirst: true,
  },
];

function FeatureScreenshotPlaceholder({ title }: { title: string }) {
  return (
    <div
      className="moneo-glass flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-6 text-center sm:aspect-video"
      aria-hidden
    >
      {/* 실제 스크린샷으로 교체 필요 */}
      <ImageIcon className="size-8 text-indigo-400/50" strokeWidth={1.25} />
      <p className="text-xs text-gray-500">{title} 스크린샷</p>
      <p className="text-[10px] text-gray-600">실제 스크린샷으로 교체 필요</p>
    </div>
  );
}

export function AboutFeatureSections() {
  return (
    <div className="space-y-16 sm:space-y-20 lg:space-y-24">
      {ABOUT_FEATURES.map((feature) => (
        <section
          key={feature.title}
          className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-16"
          aria-labelledby={`about-feature-${feature.title}`}
        >
          <div className={feature.imageFirst ? "order-1" : "order-1 lg:order-2"}>
            <FeatureScreenshotPlaceholder title={feature.title} />
          </div>

          <div
            className={`min-w-0 ${feature.imageFirst ? "order-2" : "order-2 lg:order-1"}`}
          >
            <h2
              id={`about-feature-${feature.title}`}
              className="text-2xl font-semibold tracking-tight text-white sm:text-3xl"
            >
              {feature.title}
            </h2>
            <p className="mt-4 text-sm font-medium text-indigo-300/90 sm:text-base">
              {feature.pain}
            </p>
            <div className="mt-5 space-y-3 text-sm leading-relaxed text-[var(--moneo-muted)] sm:text-base">
              {feature.solution.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
