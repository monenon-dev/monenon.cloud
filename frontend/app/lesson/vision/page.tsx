"use client";

import { useState } from "react";
import { Eye, ImageUp } from "lucide-react";

export default function LenaVisionPage() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPreviewUrl(null);
      setFileName("");
      return;
    }
    setFileName(file.name);
    const url = URL.createObjectURL(file);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
  };

  return (
    <div className="px-6 py-14 sm:px-10 lg:px-14">
      <div className="flex items-start justify-between gap-8">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-widest text-gray-400">LESSON</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">4. 레나 vision</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
            컴퓨터 비전으로 타이타닉 관련 이미지를 분석합니다. 승객 사진·선박 도면 등을 업로드해 시각적
            특징을 탐색하는 실습 페이지입니다.
          </p>
        </div>
        <div
          className="relative hidden h-36 w-72 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-100 via-indigo-50 to-white lg:flex"
          aria-hidden
        >
          <Eye className="h-16 w-16 text-violet-400/80" />
        </div>
      </div>

      <section className="mt-14">
        <div className="overflow-hidden rounded-2xl border border-dashed border-gray-300 bg-white">
          <div className="px-10 py-14 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <ImageUp className="h-6 w-6" aria-hidden />
            </div>
            <p className="text-sm font-medium text-gray-800">분석할 이미지를 업로드해주세요.</p>
            <p className="mt-2 text-xs text-gray-500">지원 형식: JPG, PNG, WebP</p>
            <div className="mx-auto mt-6 flex max-w-md flex-col items-center gap-4">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              {fileName ? <p className="text-xs text-gray-600">선택된 파일: {fileName}</p> : null}
              {previewUrl ? (
                <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="업로드 미리보기"
                    className="mx-auto max-h-64 rounded-lg object-contain"
                  />
                </div>
              ) : null}
              <p className="text-xs text-gray-500">
                백엔드 vision API 연동 전까지는 브라우저에서 미리보기만 표시됩니다.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
