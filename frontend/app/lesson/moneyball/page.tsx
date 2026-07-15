"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Loader2 } from "lucide-react";

import { LessonLayout } from "@/components/lesson/lesson-layout";
import { getApiBaseUrl } from "@/lib/api-base";

type TableCounts = {
  stadium: number;
  team: number;
  player: number;
  schedule: number;
  total: number;
};

const EMPTY_COUNTS: TableCounts = {
  stadium: 0,
  team: 0,
  player: 0,
  schedule: 0,
  total: 0,
};

const EXPECTED: TableCounts = {
  stadium: 20,
  team: 15,
  player: 480,
  schedule: 180,
  total: 695,
};

export default function MoneyballSeedPage() {
  const apiBase = getApiBaseUrl().replace(/\/$/, "");
  const [counts, setCounts] = useState<TableCounts>(EMPTY_COUNTS);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/moneyball/overview`);
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        counts?: TableCounts;
        detail?: string;
      };
      if (!res.ok || !data.counts) {
        setError(data.detail ?? `개요 조회 실패 (${res.status})`);
        setCounts(EMPTY_COUNTS);
        return;
      }
      setCounts(data.counts);
    } catch {
      setError("백엔드(8000)에 연결할 수 없습니다.");
      setCounts(EMPTY_COUNTS);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const handleSeed = async () => {
    setSeeding(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/api/moneyball/seed`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        counts?: TableCounts;
        files?: string[];
        detail?: string;
      };
      if (!res.ok || data.ok === false) {
        setError(data.detail ?? `시드 실패 (${res.status})`);
        return;
      }
      if (data.counts) setCounts(data.counts);
      const files = data.files?.join(", ") ?? "";
      setMessage(
        `더미 데이터 적재 완료 — 경기장 ${data.counts?.stadium ?? 0}, 팀 ${data.counts?.team ?? 0}, 선수 ${data.counts?.player ?? 0}, 일정 ${data.counts?.schedule ?? 0}` +
          (files ? ` (${files})` : "")
      );
    } catch {
      setError("시드 요청 중 네트워크 오류가 발생했습니다.");
    } finally {
      setSeeding(false);
    }
  };

  const rows: { key: keyof Omit<TableCounts, "total">; label: string; expected: number }[] = [
    { key: "stadium", label: "경기장 (moneyball_stadium)", expected: EXPECTED.stadium },
    { key: "team", label: "팀 (moneyball_team)", expected: EXPECTED.team },
    { key: "player", label: "선수 (moneyball_player)", expected: EXPECTED.player },
    { key: "schedule", label: "일정 (moneyball_schedule)", expected: EXPECTED.schedule },
  ];

  return (
    <LessonLayout active="moneyball">
      <div className="px-6 py-14 sm:px-10 lg:px-14">
        <p className="font-mono text-[11px] font-semibold tracking-[0.22em] text-indigo-300/70">
          MONEYBALL
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
          K-League 더미 데이터 적재
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--moneo-muted)]">
          경기장 · 팀 · 선수 · 일정 테이블에 수업용 샘플 데이터를 넣습니다. 기존 moneyball 데이터는
          삭제된 뒤 stadium → team → player → schedule 순으로 다시 채워집니다.
        </p>

        <section className="mt-10 rounded-2xl border border-[var(--moneo-border)] bg-[var(--moneo-bg-elevated)] p-6 moneo-glass">
          <h2 className="text-sm font-bold tracking-widest text-white">실행 순서</h2>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-indigo-100/85">
            <li>경기장 (stadium) — 20건</li>
            <li>팀 (team) — 15건</li>
            <li>선수 (player) — 480건</li>
            <li>일정 (schedule) — 180건</li>
          </ol>
        </section>

        <section className="mt-8 rounded-2xl border border-[var(--moneo-border)] bg-[var(--moneo-bg-elevated)] p-6 moneo-glass">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-sm font-bold tracking-widest text-white">테이블 현황</h2>
            <button
              type="button"
              onClick={() => void loadOverview()}
              disabled={loading || seeding}
              className="text-xs text-indigo-300 hover:text-indigo-200 hover:underline disabled:opacity-50"
            >
              새로고침
            </button>
          </div>

          {loading ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-[var(--moneo-muted)]">
              <Loader2 className="size-4 animate-spin" />
              조회 중…
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {rows.map(({ key, label, expected }) => (
                <li
                  key={key}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3 text-sm"
                >
                  <span className="text-indigo-100/90">{label}</span>
                  <span className="font-mono text-indigo-200">
                    {counts[key].toLocaleString()} / {expected.toLocaleString()}
                  </span>
                </li>
              ))}
              <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-4 py-3 text-sm font-medium text-white">
                <span>합계</span>
                <span className="font-mono">
                  {counts.total.toLocaleString()} / {EXPECTED.total.toLocaleString()}
                </span>
              </li>
            </ul>
          )}

          {error ? (
            <p role="alert" className="mt-4 text-sm text-red-300">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="mt-4 text-sm text-emerald-300">{message}</p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void handleSeed()}
              disabled={seeding || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {seeding ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
              더미 데이터 넣기
            </button>
          </div>
          <p className="mt-4 text-xs text-[var(--moneo-muted)]">
            Alembic 마이그레이션(<code className="text-indigo-200/80">alembic upgrade head</code>)으로
            moneyball_* 테이블이 생성된 상태에서 실행하세요.
          </p>
        </section>
      </div>
    </LessonLayout>
  );
}
