import Link from "next/link";

import { routes } from "@/lib/routes";
import { Bot, Calendar, Shield, Shirt } from "lucide-react";

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
        <p className="text-sm text-gray-500 dark:text-gray-400">활동 요약</p>
        <h2 className="mt-2 text-xl font-semibold">
          {nickname}님, 오늘도 Moneo와 함께해요
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          에이전트 <span className="font-medium text-indigo-600 dark:text-indigo-400">{agentName}</span>
          가 맞춤 추천을 도와드립니다.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Shield} label="역할" value={roleLabel} />
        <StatCard icon={Calendar} label="가입일" value={joinDate} />
        <StatCard icon={Shirt} label="관심 분야" value={`${interestCount}개 선택됨`} />
      </div>

      <section className={mypageCardClass}>
        <h3 className="text-base font-semibold">빠른 이동</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          <QuickLink href="/" icon={Bot} label="에이전트 채팅" />
          <QuickLink href={routes.lifestyle.closet} icon={Shirt} label="오늘의 옷장" />
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
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
        <Icon size={16} />
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-3 text-lg font-semibold">{value}</p>
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
      className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950 px-4 py-2.5 text-sm font-medium hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
    >
      <Icon size={16} className="text-indigo-600 dark:text-indigo-400" />
      {label}
    </Link>
  );
}
