"use client";

import { useCallback, useEffect, useState } from "react";
import { getTitanicApiBaseUrl } from "@/lib/api-base";

type WalterProfile = {
  id: number;
  name: string;
  memo: string;
};

type TitanicRow = {
  PassengerId: number;
  Survived: number | null;
  Pclass: number;
  Name: string;
  gender: string;
  Age: number | null;
  SibSp: number;
  Parch: number;
  Ticket: string;
  Fare: number;
  Cabin: string | null;
  Embarked: string | null;
};

type PaginatedResponse = {
  items: TitanicRow[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  detail?: string;
};

const PAGE_SIZE = 50;
const COLUMNS: (keyof TitanicRow)[] = [
  "PassengerId",
  "Survived",
  "Pclass",
  "Name",
  "gender",
  "Age",
  "SibSp",
  "Parch",
  "Ticket",
  "Fare",
  "Cabin",
  "Embarked",
];

export default function WalterPassengersPage() {
  const [profile, setProfile] = useState<WalterProfile | null>(null);
  const [profileMessage, setProfileMessage] = useState("");
  const [rows, setRows] = useState<TitanicRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [rowsMessage, setRowsMessage] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`${getTitanicApiBaseUrl()}/titanic/walter/myself`);
      const data = (await res.json().catch(() => ({}))) as WalterProfile & { detail?: string };
      if (!res.ok) {
        setProfile(null);
        setProfileMessage(data.detail ?? "월터 소개를 불러오지 못했습니다.");
        return;
      }
      setProfile(data);
      setProfileMessage("");
    } catch {
      setProfile(null);
      setProfileMessage("월터 소개를 불러오지 못했습니다.");
    }
  }, []);

  const fetchRows = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `${getTitanicApiBaseUrl()}/titanic/walter/passengers?page=${targetPage}&page_size=${PAGE_SIZE}`
      );
      const data = (await res.json().catch(() => ({}))) as PaginatedResponse & { detail?: string };
      if (!res.ok) {
        setRows([]);
        setRowsMessage(data.detail ?? "승객 명단을 불러오지 못했습니다.");
        setTotal(0);
        setTotalPages(1);
        return;
      }

      const items = Array.isArray(data.items) ? data.items : [];
      setRows(items);
      setPage(data.page ?? targetPage);
      setTotal(data.total ?? items.length);
      setTotalPages(Math.max(1, data.total_pages ?? 1));
      setRowsMessage(
        items.length > 0
          ? ""
          : (data.detail ?? "저장된 Passenger 데이터가 없습니다. CSV를 업로드해주세요.")
      );
    } catch {
      setRows([]);
      setRowsMessage("승객 명단을 불러오지 못했습니다.");
      setTotal(0);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await fetchProfile();
    await fetchRows(page);
  }, [fetchProfile, fetchRows, page]);

  useEffect(() => {
    void fetchProfile();
    void fetchRows(1);
  }, [fetchProfile, fetchRows]);

  const rangeStart = total > 0 ? (page - 1) * PAGE_SIZE + 1 : 0;
  const rangeEnd = total > 0 ? Math.min(page * PAGE_SIZE, total) : 0;

  return (
    <div className="space-y-8 px-6 py-10">
        <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6">
          <p className="text-[11px] font-semibold tracking-widest text-indigo-400">WALTER ROASTER</p>
          <h1 className="mt-2 text-xl font-bold text-gray-900">월터의 자기소개</h1>
          <p className="mt-2 text-sm text-gray-600">
            타이타닉 승무원 월터가 Neon DB의 Passenger 명단을 조회합니다.
          </p>

          {profile ? (
            <dl className="mt-5 grid gap-3 rounded-xl border border-indigo-100 bg-white p-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-gray-500">ID</dt>
                <dd className="mt-1 font-medium text-gray-900">{profile.id}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Name</dt>
                <dd className="mt-1 font-medium text-gray-900">{profile.name}</dd>
              </div>
              <div className="sm:col-span-3">
                <dt className="text-xs text-gray-500">Memo</dt>
                <dd className="mt-1 font-medium text-gray-900">{profile.memo}</dd>
              </div>
            </dl>
          ) : null}
          {profileMessage ? <p className="mt-4 text-xs text-gray-600">{profileMessage}</p> : null}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-gray-800">월터가 조회한 Passenger 명단</h2>
              <p className="mt-1 text-xs text-gray-500">
                API: <code>/api/titanic/walter/passengers</code>
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refreshAll()}
              disabled={loading}
              className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              {loading ? "불러오는 중..." : "새로고침"}
            </button>
          </div>

          {rowsMessage ? <p className="px-5 py-4 text-xs text-gray-600">{rowsMessage}</p> : null}

          {rows.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      {COLUMNS.map((col) => (
                        <th key={col} className="whitespace-nowrap px-3 py-2 text-left font-semibold">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.PassengerId} className="border-t border-gray-100">
                        {COLUMNS.map((col) => (
                          <td key={col} className="whitespace-nowrap px-3 py-2">
                            {row[col] ?? ""}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-xs">
                <p className="text-gray-600">
                  총 {total}명 중 {rangeStart}-{rangeEnd}명 표시
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void fetchRows(Math.max(1, page - 1))}
                    disabled={page <= 1 || loading}
                    className="rounded border border-gray-300 px-2 py-1 disabled:opacity-50"
                  >
                    이전
                  </button>
                  <span className="text-gray-700">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => void fetchRows(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages || loading}
                    className="rounded border border-gray-300 px-2 py-1 disabled:opacity-50"
                  >
                    다음
                  </button>
                </div>
              </div>
            </>
          ) : null}
        </section>
    </div>
  );
}
