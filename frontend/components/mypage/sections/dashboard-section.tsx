import Link from "next/link";

import { routes } from "@/lib/routes";
import { Bot, Briefcase, Calendar, Shield } from "lucide-react";

import { mypageCardClass } from "@/components/mypage/mypage-sidebar-layout";

type DashboardSectionProps = {
  nickname: string;
  roleLabel: string;
  joinDate: string;
  agentName: string;
  interestCount: number;
};

export function DashboardSection({
  nickname,
  roleLabel,
  joinDate,
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Shield} label="역할" value={roleLabel} />
        <StatCard icon={Calendar} label="가입일" value={joinDate} />
        <StatCard icon={Briefcase} label="주요 활용 분야" value={`${interestCount}개 선택됨`} />
      </div>

      <section className={mypageCardClass}>
        <h3 className="text-base font-semibold text-white">빠른 이동</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <QuickLink href="/" icon={Bot} label="에이전트 채팅" />
          <QuickLink href={routes.agent.history} icon={Briefcase} label="Agent 히스토리" />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Shield;
  label: string;
  value: string;
}) {
  return (
    <div className={mypageCardClass}>
      <div className="flex items-center gap-2 text-[var(--moneo-muted)]">
        <Icon size={16} />
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
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
