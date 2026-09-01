"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Calendar, Loader2, LogOut, Pencil, Shield } from "lucide-react";

import { mypageCardClass } from "@/components/mypage/mypage-sidebar-layout";
import { getChatUserId } from "@/lib/chat-user";
import { routes } from "@/lib/routes";
import { fetchUserSettings, patchUserSettings } from "@/lib/user-settings";

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
  const [kakaoSync, setKakaoSync] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(true);
  const [kakaoBusy, setKakaoBusy] = useState(false);
  const [kakaoMsg, setKakaoMsg] = useState<string | null>(null);

  useEffect(() => {
    const userId = getChatUserId();
    if (!userId) {
      setKakaoLoading(false);
      return;
    }
    void (async () => {
      try {
        const data = await fetchUserSettings(userId);
        setKakaoSync(Boolean(data.kakao_calendar_sync));
      } catch {
        /* ignore */
      } finally {
        setKakaoLoading(false);
      }
    })();
  }, []);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleKakaoSyncToggle = async (next: boolean) => {
    const userId = getChatUserId();
    if (!userId || kakaoBusy) return;
    setKakaoBusy(true);
    setKakaoMsg(null);
    try {
      if (next) {
        await patchUserSettings(userId, { kakao_calendar_sync: true });
        setKakaoSync(true);
        const params = new URLSearchParams({
          next: routes.oauth.mypage,
          scope: "talk_calendar",
        });
        window.location.href = `/api/auth/start/kakao?${params.toString()}`;
        return;
      }
      await patchUserSettings(userId, { kakao_calendar_sync: false });
      setKakaoSync(false);
      setKakaoMsg("톡캘린더 연동을 껐습니다.");
    } catch (err) {
      setKakaoMsg(err instanceof Error ? err.message : "설정 변경에 실패했습니다.");
      setKakaoSync(!next);
    } finally {
      setKakaoBusy(false);
    }
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
          <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--moneo-border)] bg-white/5">
            {avatarSrc ? (
              <img src={avatarSrc} alt={`${nickname} 프로필`} className="h-full w-full object-cover" />
            ) : (
              <span className="text-3xl font-semibold text-[var(--moneo-muted)]">{initials}</span>
            )}
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                <Loader2 className="animate-spin text-white" size={28} />
              </div>
            )}
          </div>
          <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--moneo-bg)] bg-indigo-600 text-white shadow-md group-hover:bg-indigo-500">
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

        <h2 className="mt-5 text-2xl font-bold text-white">{nickname}</h2>
        <p className="mt-1 break-all text-sm text-[var(--moneo-muted)]">{email}</p>
        <p className="mt-4 text-xs text-[var(--moneo-muted)]">프로필 사진을 눌러 변경할 수 있습니다</p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InfoCard icon={Shield} label="역할" value={roleLabel} />
        <InfoCard icon={Calendar} label="가입일" value={joinDate} />
      </div>

      <section className={mypageCardClass}>
        <h3 className="text-base font-semibold text-white">톡캘린더 연동</h3>
        <p className="mt-1 text-sm text-[var(--moneo-muted)]">
          켜면 메일 캘린더·라이프 일정에 등록한 일정이 카카오 톡캘린더로 동기화됩니다.
          겹치는 일정이 있으면 등록 전에 확인을 요청합니다.
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm text-indigo-100/90">
            {kakaoLoading ? "불러오는 중…" : kakaoSync ? "연동 ON" : "연동 OFF"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={kakaoSync}
            disabled={kakaoLoading || kakaoBusy}
            onClick={() => void handleKakaoSyncToggle(!kakaoSync)}
            className={`relative h-7 w-12 rounded-full transition-colors disabled:opacity-50 ${
              kakaoSync ? "bg-indigo-500" : "bg-white/15"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 size-6 rounded-full bg-white transition-transform ${
                kakaoSync ? "translate-x-5" : ""
              }`}
            />
          </button>
        </div>
        {kakaoMsg ? <p className="mt-2 text-xs text-[var(--moneo-muted)]">{kakaoMsg}</p> : null}
        <p className="mt-2 text-xs text-[var(--moneo-muted)]">
          카카오 로그인 사용자만 이용할 수 있습니다. 켤 때 톡캘린더 동의가 한 번 더 필요합니다.
        </p>
      </section>

      <section className={mypageCardClass}>
        <h3 className="text-base font-semibold text-white">계정</h3>
        <p className="mt-1 text-sm text-[var(--moneo-muted)]">
          비밀번호 변경은 추후 지원 예정입니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--moneo-border)] px-4 py-2.5 text-sm font-medium text-indigo-100/90 hover:bg-white/[0.04]"
          >
            <LogOut size={16} />
            로그아웃
          </button>
          <Link
            href="/"
            className="inline-flex items-center rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
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
      <div className="flex items-center gap-2 text-[var(--moneo-muted)]">
        <Icon size={16} />
        <span className="text-sm">{label}</span>
      </div>
      <p className="mt-3 text-base font-semibold text-white">{value}</p>
    </div>
  );
}
