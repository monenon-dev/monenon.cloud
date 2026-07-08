"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { fetchPersonaMyself } from "@/lib/silicon-valley-api";
import { TEAM_PERSONAS } from "@/lib/silicon-valley-personas";

type PersonaRow = {
  slug: string;
  displayName: string;
  role: string;
  text: string;
  status: "loading" | "ok" | "error";
};

export default function SiliconValleyAdminPage() {
  const [rows, setRows] = useState<PersonaRow[]>(
    TEAM_PERSONAS.map((p) => ({
      slug: p.slug,
      displayName: p.displayName,
      role: p.role,
      text: "",
      status: "loading",
    }))
  );

  useEffect(() => {
    TEAM_PERSONAS.forEach(async (persona) => {
      try {
        const text = await fetchPersonaMyself(persona.slug);
        setRows((prev) =>
          prev.map((row) =>
            row.slug === persona.slug ? { ...row, text, status: "ok" } : row
          )
        );
      } catch (err) {
        setRows((prev) =>
          prev.map((row) =>
            row.slug === persona.slug
              ? {
                  ...row,
                  text: err instanceof Error ? err.message : "요청 실패",
                  status: "error",
                }
              : row
          )
        );
      }
    });
  }, []);

  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900 dark:bg-[#0a0a0a] dark:text-gray-100">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-md dark:border-gray-800 dark:bg-[#111111]/90">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
              Admin
            </p>
            <h1 className="text-lg font-bold">Pied Piper 관리자</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900"
            >
              홈
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          로그인 없이 5인 페르소나 <code className="rounded bg-gray-100 px-1 dark:bg-gray-900">/api/v1/&#123;slug&#125;/myself</code>{" "}
          응답을 확인합니다.
        </p>

        <div className="space-y-4">
          {rows.map((row) => (
            <section
              key={row.slug}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#111111]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold">{row.displayName}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{row.role}</p>
                </div>
                <code className="text-xs text-blue-600 dark:text-blue-400">/api/v1/{row.slug}/myself</code>
              </div>
              <p
                className={`mt-4 rounded-lg p-3 text-sm leading-relaxed ${
                  row.status === "error"
                    ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                    : "bg-gray-50 text-gray-800 dark:bg-[#0a0a0a] dark:text-gray-200"
                }`}
              >
                {row.status === "loading" ? "불러오는 중…" : row.text || "—"}
              </p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
