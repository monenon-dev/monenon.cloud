import { getApiBaseUrl } from "@/lib/api-base";

const apiBaseUrl = getApiBaseUrl();

export type AdminUserRole = "admin" | "user";

export type AdminUser = {
  id: number;
  nickname: string;
  email: string;
  role: AdminUserRole;
  warning_count: number;
  is_suspended: boolean;
  suspended_until: string | null;
};

export type AdminUserFilter = "all" | "admins" | "members";

function usersPath(filter: AdminUserFilter): string {
  if (filter === "admins") return "/admin/users/admins";
  if (filter === "members") return "/admin/users/members";
  return "/admin/users";
}

export async function fetchAdminUsers(filter: AdminUserFilter): Promise<AdminUser[]> {
  const res = await fetch(`${apiBaseUrl}${usersPath(filter)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      typeof data.detail === "string" ? data.detail : "사용자 목록을 불러오지 못했습니다."
    );
  }
  return res.json();
}

export async function createAdminMember(body: {
  nickname: string;
  email: string;
  password: string;
  role: "user";
}): Promise<AdminUser> {
  const res = await fetch(`${apiBaseUrl}/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.detail === "string" ? data.detail : "계정 생성에 실패했습니다."
    );
  }
  return data;
}

export async function withdrawAdminMember(userId: number): Promise<void> {
  const res = await fetch(`${apiBaseUrl}/admin/users/${userId}`, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      typeof data.detail === "string" ? data.detail : "탈퇴 처리에 실패했습니다."
    );
  }
}

export type WarningSendResult = {
  warning: { id: number; admin_id: number; user_id: number; message: string };
  warning_count: number;
  suspended: boolean;
  suspended_until: string | null;
};

export async function sendAdminWarning(
  userId: number,
  message: string,
  suspendDays?: 1 | 3 | 5
): Promise<WarningSendResult> {
  const body: { message: string; suspend_days?: number } = { message };
  if (suspendDays !== undefined) {
    body.suspend_days = suspendDays;
  }
  const res = await fetch(`${apiBaseUrl}/admin/users/${userId}/warnings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.detail === "string" ? data.detail : "경고 전송에 실패했습니다."
    );
  }
  return data;
}

export async function unsuspendAdminMember(userId: number): Promise<AdminUser> {
  const res = await fetch(`${apiBaseUrl}/admin/users/${userId}/unsuspend`, {
    method: "POST",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.detail === "string" ? data.detail : "정지 해제에 실패했습니다."
    );
  }
  return data;
}

export type AdminUserSettingRow = {
  user_id: number;
  nickname: string;
  email: string;
  has_settings: boolean;
  language: string | null;
  preferred_model: string | null;
  updated_at: string | null;
};

export async function fetchAdminUserSettings(): Promise<AdminUserSettingRow[]> {
  const res = await fetch(`${apiBaseUrl}/admin/user-settings`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "사용자 설정 목록을 불러오지 못했습니다."
    );
  }
  return res.json();
}

export type ModelUsageStat = { model: string; count: number };
export type ApiCallDailyStat = { date: string; count: number };
export type RiskyAccountAlert = {
  warning_id: number;
  user_id: number;
  nickname: string;
  email: string;
  message: string;
  created_at: string | null;
};
export type AdminDashboardOverview = {
  model_usage: ModelUsageStat[];
  api_calls_daily: ApiCallDailyStat[];
  total_api_calls: number;
  risky_accounts: RiskyAccountAlert[];
  unprocessed_risk_count: number;
};

export async function fetchAdminDashboard(): Promise<AdminDashboardOverview> {
  const res = await fetch(`${apiBaseUrl}/admin/dashboard/overview`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      typeof data.detail === "string" ? data.detail : "대시보드를 불러오지 못했습니다."
    );
  }
  return res.json();
}

export async function markAdminRiskProcessed(warningId: number): Promise<void> {
  const res = await fetch(`${apiBaseUrl}/admin/dashboard/risks/${warningId}/processed`, {
    method: "POST",
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      typeof data.detail === "string" ? data.detail : "처리 완료에 실패했습니다."
    );
  }
}
