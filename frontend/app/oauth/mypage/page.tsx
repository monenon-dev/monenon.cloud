"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

import { AccountSection } from "@/components/mypage/sections/account-section";
import { BriefingNotifySection } from "@/components/mypage/sections/briefing-notify-section";
import { DashboardSection } from "@/components/mypage/sections/dashboard-section";
import { PreferencesSection } from "@/components/mypage/sections/preferences-section";
import {
  MyPageSidebarLayout,
  type MyPageSection,
} from "@/components/mypage/mypage-sidebar-layout";
import { getAuthSession, logoutAuthSession } from "@/lib/auth-api";
import { routes } from "@/lib/routes";
import { formatApiError } from "@/lib/format-api-error";
import {
  isWorkSituationComplete,
  loadMyPagePreferences,
  saveMyPagePreferences,
  type MyPagePreferences,
} from "@/lib/mypage-preferences";
import { getApiBaseUrl } from "@/lib/api-base";
import type { MyPageSectionId } from "@/lib/routes";

const apiBaseUrl = getApiBaseUrl();

const VALID_MYPAGE_SECTIONS = new Set<MyPageSectionId>([
  "dashboard",
  "preferences",
  "notifications",
  "account",
]);

interface UserProfile {
  id: number;
  nickname: string;
  email: string;
  role: string;
  created_at: string | null;
  profile_image_url: string | null;
}

function formatJoinDate(iso: string | null): string {
  if (!iso) return "정보 없음";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "정보 없음";
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function roleLabel(role: string): string {
  if (role === "admin") return "관리자";
  if (role === "user") return "일반 회원";
  return role;
}

function avatarUrl(path: string | null, cacheKey: number): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${apiBaseUrl}${path}?v=${cacheKey}`;
}

function initials(nickname: string): string {
  const trimmed = nickname.trim();
  if (!trimmed) return "?";
  return trimmed.slice(0, 2);
}

export default function MyPage() {
  return (
    <Suspense
      fallback={
        <main className="relative flex min-h-screen items-center justify-center moneo-grid-bg text-[var(--moneo-text)]">
          <div className="moneo-noise pointer-events-none absolute inset-0 -z-10" aria-hidden />
          <Loader2 className="animate-spin text-indigo-400" size={36} />
        </main>
      }
    >
      <MyPageContent />
    </Suspense>
  );
}

function MyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ui, setUi] = useState({
    activeSection: "dashboard" as MyPageSection,
    loading: true,
    error: null as string | null,
    uploading: false,
    avatarKey: 0,
    prefsSaving: false,
    prefsSavedMessage: null as string | null,
    prefsError: null as string | null,
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [prefs, setPrefs] = useState<MyPagePreferences>({
    speechTone: "formal",
    agentName: "Moneo",
    interests: [],
    userType: null,
    industry: null,
  });

  const patchUi = (patch: Partial<typeof ui>) => setUi((prev) => ({ ...prev, ...patch }));

  const loadProfile = async (userId: string) => {
    patchUi({ loading: true, error: null });
    try {
      const res = await fetch(`${apiBaseUrl}/auth/me?user_id=${userId}`);
      const data: Record<string, unknown> = await res.json().catch(() => ({}));
      if (!res.ok) {
        patchUi({ error: formatApiError(data, "프로필을 불러오지 못했습니다.") });
        return;
      }
      const nextProfile = data as unknown as UserProfile;
      setProfile(nextProfile);
      setPrefs(loadMyPagePreferences(nextProfile.id));
    } catch {
      patchUi({ error: "네트워크 오류가 발생했습니다." });
    } finally {
      patchUi({ loading: false });
    }
  };

  useEffect(() => {
    const section = searchParams.get("section");
    if (section && VALID_MYPAGE_SECTIONS.has(section as MyPageSectionId)) {
      patchUi({ activeSection: section as MyPageSection });
    }
  }, [searchParams]);

  useEffect(() => {
    const session = getAuthSession();
    if (!session) {
      router.replace(routes.oauth.login);
      return;
    }
    void loadProfile(String(session.user_id));
  }, [router]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const userId = sessionStorage.getItem("user_id");
    if (!file || !userId) return;

    patchUi({ uploading: true, error: null });
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${apiBaseUrl}/auth/me/avatar?user_id=${userId}`, {
        method: "POST",
        body: form,
      });
      const data: Record<string, unknown> = await res.json().catch(() => ({}));
      if (!res.ok) {
        patchUi({ error: formatApiError(data, "프로필 사진 업로드에 실패했습니다.") });
        return;
      }
      setProfile(data as unknown as UserProfile);
      setUi((prev) => ({ ...prev, avatarKey: prev.avatarKey + 1 }));
    } catch {
      patchUi({ error: "네트워크 오류가 발생했습니다." });
    } finally {
      patchUi({ uploading: false });
      e.target.value = "";
    }
  };

  const handleSavePreferences = () => {
    if (!profile) return;
    if (!isWorkSituationComplete(prefs.userType, prefs.industry)) {
      patchUi({
        prefsError:
          prefs.userType === "직장인"
            ? "직장인을 선택한 경우 업종을 골라 주세요."
            : "업무 상황을 선택해 주세요.",
        prefsSavedMessage: null,
      });
      return;
    }
    patchUi({ prefsSaving: true, prefsSavedMessage: null, prefsError: null });
    try {
      saveMyPagePreferences(profile.id, prefs);
      patchUi({ prefsSavedMessage: "취향 설정이 저장되었습니다." });
    } catch {
      patchUi({ prefsError: "설정 저장에 실패했습니다." });
    } finally {
      patchUi({ prefsSaving: false });
    }
  };

  const handleLogout = () => {
    logoutAuthSession(routes.oauth.login);
  };

  const imageSrc = profile ? avatarUrl(profile.profile_image_url, ui.avatarKey) : null;

  if (ui.loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center moneo-grid-bg text-[var(--moneo-text)]">
        <div className="moneo-noise pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <Loader2 className="animate-spin text-indigo-400" size={36} />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="relative flex min-h-screen items-center justify-center moneo-grid-bg px-4 text-[var(--moneo-text)]">
        <div className="moneo-noise pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <p className="text-sm text-red-300">
          {ui.error ?? "프로필을 불러오지 못했습니다."}
        </p>
      </main>
    );
  }

  const joinDate = formatJoinDate(profile.created_at);
  const role = roleLabel(profile.role);

  return (
    <MyPageSidebarLayout
      activeSection={ui.activeSection}
      onSectionChange={(section) => patchUi({ activeSection: section })}
      profileSummary={{
        nickname: profile.nickname,
        email: profile.email,
        avatarSrc: imageSrc,
        initials: initials(profile.nickname),
      }}
    >
      {ui.error && ui.activeSection === "account" && (
        <p className="mb-6 rounded-2xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {ui.error}
        </p>
      )}

      {ui.activeSection === "dashboard" && (
        <DashboardSection
          nickname={profile.nickname}
          agentName={prefs.agentName}
        />
      )}

      {ui.activeSection === "preferences" && (
        <PreferencesSection
          prefs={prefs}
          saving={ui.prefsSaving}
          savedMessage={ui.prefsSavedMessage}
          error={ui.prefsError}
          onChange={(patch) => setPrefs((prev) => ({ ...prev, ...patch }))}
          onSave={handleSavePreferences}
        />
      )}

      {ui.activeSection === "notifications" && <BriefingNotifySection />}

      {ui.activeSection === "account" && (
        <AccountSection
          nickname={profile.nickname}
          email={profile.email}
          roleLabel={role}
          joinDate={joinDate}
          avatarSrc={imageSrc}
          initials={initials(profile.nickname)}
          uploading={ui.uploading}
          onFileChange={handleFileChange}
          onLogout={handleLogout}
        />
      )}
    </MyPageSidebarLayout>
  );
}
