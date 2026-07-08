"use client";

import { useRef } from "react";
import Link from "next/link";
import { Calendar, Loader2, LogOut, Pencil, Shield } from "lucide-react";

import { mypageCardClass } from "@/components/mypage/mypage-sidebar-layout";

type AccountSectionProps = {
  nickname: string;
  email: string;
  roleLabel: string;
  joinDate: string;
  avatarSrc: string | null;
  initials: string;
  uploading: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogout: () => void;
};

export function AccountSection({
  nickname,
  email,
  roleLabel,
  joinDate,
  avatarSrc,
  initials,
  uploading,
  onFileChange,
  onLogout,
}: AccountSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-6">
      <section className={`${mypageCardClass} flex flex-col items-center text-center`}>
        <button
          type="button"
          onClick={handleAvatarClick}
          disabled={uploading}
          className="relative group rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          aria-label="프로필 사진 변경"
        >
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
            {avatarSrc ? (
              <img src={avatarSrc} alt={`${nickname} 프로필`} className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-semibold text-gray-400">{initials}</span>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                <Loader2 className="animate-spin text-white" size={28} />
              </div>
            )}
          </div>
          <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white dark:border-gray-900 bg-gray-700 text-white shadow-md group-hover:bg-gray-900">
            <Pencil size={16} />
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onFileChange}
        />

        <h2 className="mt-5 text-2xl font-bold">{nickname}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 break-all">{email}</p>
        <p className="mt-4 text-xs text-gray-400">프로필 사진을 눌러 변경할 수 있습니다</p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InfoCard icon={Shield} label="역할" value={roleLabel} />
        <InfoCard icon={Calendar} label="가입일" value={joinDate} />
      </div>

      <section className={mypageCardClass}>
        <h3 className="text-base font-semibold">계정</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          비밀번호 변경은 추후 지원 예정입니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-300 dark:border-gray-700 px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            <LogOut size={16} />
            로그아웃
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            홈으로
          </Link>
        </div>
      </section>
    </div>
  );
}

function InfoCard({
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
      <p className="mt-3 text-base font-semibold">{value}</p>
    </div>
  );
}
