import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { blobPutOptions, getBlobAuthError } from "@/lib/blob-config";
import { SAMSUNG_QUARTERLY_REPORT_SAMPLE } from "@/lib/samsung-quarterly-report-sample";

export const runtime = "nodejs";

function isPdfFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return file.type === "application/pdf" || name.endsWith(".pdf");
}

function textBlobName(pdfFilename: string): string {
  const base = pdfFilename.replace(/\.pdf$/i, "") || "document";
  return `pdfs/${base}.txt`;
}

export async function POST(request: Request) {
  const blobAuthError = getBlobAuthError();
  if (blobAuthError) {
    return NextResponse.json({ detail: blobAuthError }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ detail: "multipart/form-data 요청이 필요합니다." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ detail: "file 필드에 PDF 파일을 첨부해 주세요." }, { status: 400 });
  }

  if (!isPdfFile(file)) {
    return NextResponse.json({ detail: "PDF 파일만 업로드할 수 있습니다." }, { status: 400 });
  }

  const contentField = formData.get("content");
  const content =
    typeof contentField === "string" && contentField.trim()
      ? contentField.trim()
      : SAMSUNG_QUARTERLY_REPORT_SAMPLE;

  const filename = file.name || "document.pdf";

  try {
    const pdfBlob = await put(`pdfs/${filename}`, file, {
      ...blobPutOptions({
        access: "private",
        contentType: "application/pdf",
        addRandomSuffix: true,
      }),
    });

    const contentBlob = await put(textBlobName(filename), content, {
      ...blobPutOptions({
        access: "private",
        contentType: "text/plain; charset=utf-8",
        addRandomSuffix: true,
      }),
    });

    return NextResponse.json({
      filename,
      url: pdfBlob.url,
      content,
      contentUrl: contentBlob.url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "PDF 업로드에 실패했습니다.";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
