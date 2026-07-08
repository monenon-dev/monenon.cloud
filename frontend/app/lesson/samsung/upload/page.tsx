"use client";

import Link from "next/link";
import { useState } from "react";
import { FileUp } from "lucide-react";

import { uploadPdfToBlob, type PdfBlobUploadResult } from "@/lib/pdf-blob-api";
import { SAMSUNG_QUARTERLY_REPORT_SAMPLE } from "@/lib/samsung-quarterly-report-sample";

export default function SamsungFileUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [result, setResult] = useState<PdfBlobUploadResult | null>(null);

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadMessage("PDF 파일을 먼저 선택해주세요.");
      return;
    }

    setUploading(true);
    setUploadMessage("");
    setResult(null);
    try {
      const uploaded = await uploadPdfToBlob(selectedFile, SAMSUNG_QUARTERLY_REPORT_SAMPLE);
      setResult(uploaded);
      setUploadMessage("분기보고서 PDF와 본문 텍스트가 Blob에 저장되었습니다.");
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : "업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="px-6 py-14 sm:px-10 lg:px-14">
      <div className="flex items-start justify-between gap-8">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-widest text-gray-400">LESSON · SAMSUNG</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">2. 파일 업로드</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
            DART 분기보고서 PDF를 업로드합니다. 파일은 Vercel Blob에 저장되며, 표지 본문 텍스트가 함께
            기록됩니다.
          </p>
          <Link
            href="/lesson/samsung"
            className="mt-4 inline-block text-xs text-indigo-600 hover:underline"
          >
            ← 1. 삼성전자 분석으로 돌아가기
          </Link>
        </div>
        <div
          className="relative hidden h-36 w-72 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-br from-blue-900 via-blue-700 to-slate-400 lg:block"
          aria-hidden
        />
      </div>

      <section className="mt-10">
        <div className="overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-white">
          <div className="px-10 py-14 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-600">
              <FileUp className="h-6 w-6" aria-hidden />
            </div>
            <p className="text-sm font-medium text-gray-800">분기보고서 PDF를 업로드해주세요.</p>
            <p className="mt-2 text-xs text-gray-500">
              업로드 주소: <code>/api/blob/pdf</code> (POST)
            </p>
            <div className="mx-auto mt-6 flex max-w-md flex-col items-center gap-3">
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void handleUpload()}
                disabled={uploading}
                className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? "업로드 중..." : "PDF 업로드"}
              </button>
              {uploadMessage ? <p className="text-xs text-gray-600">{uploadMessage}</p> : null}
              {result ? (
                <div className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left text-xs text-gray-700">
                  <p>
                    <span className="font-medium">파일명:</span> {result.filename}
                  </p>
                  <p className="mt-1 break-all">
                    <span className="font-medium">PDF 경로:</span> {result.url}
                  </p>
                  <p className="mt-1 break-all">
                    <span className="font-medium">본문 경로:</span> {result.contentUrl}
                  </p>
                  <p className="mt-2 text-gray-500">Private 스토어 — URL은 서버 인증 없이 브라우저에서 열리지 않습니다.</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
