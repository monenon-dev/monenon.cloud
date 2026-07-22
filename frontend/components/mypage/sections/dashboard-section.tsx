import Link from "next/link";

import { RecentActivityCard } from "@/components/mypage/recent-activity-card";
import { mypageCardClass } from "@/components/mypage/mypage-sidebar-layout";
import { routes } from "@/lib/routes";
import { Bot, Briefcase, Terminal } from "lucide-react";

type DashboardSectionProps = {
  nickname: string;
  agentName: string;
  interestCount: number;
};

export function DashboardSection({
  nickname,
  agentName,
  interestCount,
}: DashboardSectionProps) {
  return (
    <div className="space-y-6">
      <section className={mypageCardClass}>
        <p className="text-sm text-[var(--moneo-muted)]">활동 요약</p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          {nickname}님, 오늘도 Moneo와 함께해요
        </h2>
        <p className="mt-2 text-sm text-[var(--moneo-muted)]">
          에이전트 <span className="font-medium text-indigo-300">{agentName}</span>
          가 맞춤 업무 지원을 도와드립니다.
        </p>
      </section>

      <InterestCard interestCount={interestCount} />

      <RecentActivityCard />

      <section className={mypageCardClass}>
        <h3 className="text-base font-semibold text-white">빠른 이동</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <QuickLink href={routes.lifestyle.chats} icon={Bot} label="에이전트 채팅" />
          <QuickLink href={routes.agent.history} icon={Terminal} label="에이전트 히스토리" />
        </div>
      </section>
    </div>
  );
}

function InterestCard({ interestCount }: { interestCount: number }) {
  const empty = interestCount === 0;

  return (
    <div className={mypageCardClass}>
      <div className="flex items-center gap-2 text-[var(--moneo-muted)]">
        <Briefcase size={16} />
        <span className="text-sm">주요 활용 분야</span>
      </div>
      <p className="mt-3 text-lg font-semibold text-white">
        {empty ? "0개 선택됨" : `${interestCount}개 선택됨`}
      </p>
      {empty ? (
        <Link
          href={routes.oauth.mypagePreferences}
          className="mt-3 inline-flex text-sm font-medium text-indigo-400 transition-colors hover:text-indigo-300"
        >
          취향 설정에서 선택하기 →
        </Link>
      ) : null}
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Bot;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-2xl border border-[var(--moneo-border)] bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-indigo-100/90 transition-colors hover:border-indigo-400/40 hover:bg-white/[0.06]"
    >
      <Icon size={16} className="text-indigo-300" />
      {label}
    </Link>
  );
}
