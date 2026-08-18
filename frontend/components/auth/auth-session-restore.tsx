"use client";

import { useEffect } from "react";

import { restoreAuthSessionFromRefresh } from "@/lib/auth-api";

/** 새로고침·새 탭에서 refresh 쿠키로 access token 복원 */
export function AuthSessionRestore() {
  useEffect(() => {
    void restoreAuthSessionFromRefresh();
  }, []);
  return null;
}
