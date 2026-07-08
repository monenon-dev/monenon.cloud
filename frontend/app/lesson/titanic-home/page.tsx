"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FileUp } from "lucide-react";

import { getTitanicApiBaseUrl } from "@/lib/api-base";

export default function TitanicDataCollectionPage() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadMessage("CSV 파일을 먼저 선택해주세요.");
      return;
    }

    setUploading(true);
    setUploadMessage("");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 120_000);
      const res = await fetch(`${getTitanicApiBaseUrl()}/titanic/james/upload`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
      const data = (await res.json().catch(() => ({}))) as {
        count?: number;
        columns?: string[];
        detail?: string;
      };

      if (!res.ok || data.detail) {
        setUploadMessage(data.detail ?? "업로드에 실패했습니다.");
        return;
      }

      const columnsText = Array.isArray(data.columns) ? data.columns.join(", ") : "";
      setUploadMessage(
        `업로드 완료: ${data.count ?? 0}건 수신됨` + (columnsText ? ` | 컬럼: ${columnsText}` : "")
      );
      router.push("/lesson/titanic-home/smith");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setUploadMessage("업로드 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.");
      } else {
        setUploadMessage("서버 연결에 실패했습니다. 백엔드(8000)가 실행 중인지 확인해주세요.");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="px-6 py-14 sm:px-10 lg:px-14">
      <div className="flex items-start justify-between gap-8">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-widest text-gray-400">LESSON</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">1. 데이터 수집</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
            캐글(Kaggle)에서 다운로드한 CSV를 업로드합니다. 수집된 데이터는 이후 Neon DB에 적재하는 단계로
            이어집니다.
          </p>
        </div>
        <div
          className="relative hidden h-36 w-72 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-slate-700 via-slate-500 to-slate-300 lg:block"
          aria-hidden
        />
      </div>

      <section className="mt-14">
        <div className="overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-white">
          <div className="px-10 py-14 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-600">
              <FileUp className="h-6 w-6" aria-hidden />
            </div>
            <p className="text-sm font-medium text-gray-800">Lesson CSV를 업로드해주세요.</p>
            <p className="mt-2 text-xs text-gray-500">
              업로드 주소: <code>/api/titanic/james/upload</code> (POST)
            </p>
            <div className="mx-auto mt-6 flex max-w-md flex-col items-center gap-3">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void handleUpload()}
                disabled={uploading}
                className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? "업로드 중..." : "CSV 업로드"}
              </button>
              {uploadMessage ? <p className="text-xs text-gray-600">{uploadMessage}</p> : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
