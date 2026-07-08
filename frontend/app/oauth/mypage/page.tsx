"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { AccountSection } from "@/components/mypage/sections/account-section";
import { DashboardSection } from "@/components/mypage/sections/dashboard-section";
import { PreferencesSection } from "@/components/mypage/sections/preferences-section";
import { ThemeSection } from "@/components/mypage/sections/theme-section";
import {
  MyPageSidebarLayout,
  type MyPageSection,
} from "@/components/mypage/mypage-sidebar-layout";
import { clearAuthSession } from "@/lib/auth-api";
import { routes } from "@/lib/routes";
import { getApiBaseUrl } from "@/lib/api-base";
import { formatApiError } from "@/lib/format-api-error";
import {
  applyThemeMode,
  loadMyPagePreferences,
  loadThemeMode,
  saveMyPagePreferences,
  type MyPagePreferences,
  type ThemeMode,
} from "@/lib/mypage-preferences";

const apiBaseUrl = getApiBaseUrl();

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
  const router = useRouter();
  const [ui, setUi] = useState({
    activeSection: "dashboard" as MyPageSection,
    loading: true,
    error: null as string | null,
    uploading: false,
    avatarKey: 0,
    prefsSaving: false,
    prefsSavedMessage: null as string | null,
    prefsError: null as string | null,
    themeMode: "system" as ThemeMode,
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [prefs, setPrefs] = useState<MyPagePreferences>({
    speechTone: "friendly",
    agentName: "모네난",
    interests: [],
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
    const token = sessionStorage.getItem("access_token");
    const userId = sessionStorage.getItem("user_id");
    if (!token || !userId) {
      router.replace(routes.oauth.login);
      return;
    }
    const theme = loadThemeMode();
    applyThemeMode(theme);
    patchUi({ themeMode: theme });
    void loadProfile(userId);
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
    clearAuthSession();
    router.push(routes.oauth.login);
  };

  const imageSrc = profile ? avatarUrl(profile.profile_image_url, ui.avatarKey) : null;

  if (ui.loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="animate-spin text-indigo-600" size={36} />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <p className="text-sm text-red-600 dark:text-red-400">
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
        <p className="mb-6 rounded-2xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          {ui.error}
        </p>
      )}

      {ui.activeSection === "dashboard" && (
        <DashboardSection
          nickname={profile.nickname}
          roleLabel={role}
          joinDate={joinDate}
          agentName={prefs.agentName}
          interestCount={prefs.interests.length}
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

      {ui.activeSection === "theme" && (
        <ThemeSection
          themeMode={ui.themeMode}
          onThemeChange={(mode) => patchUi({ themeMode: mode })}
        />
      )}

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
