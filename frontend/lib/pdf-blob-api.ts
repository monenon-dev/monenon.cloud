import { SAMSUNG_QUARTERLY_REPORT_SAMPLE } from "@/lib/samsung-quarterly-report-sample";

export type PdfBlobUploadResult = {
  filename: string;
  url: string;
  content: string;
  contentUrl: string;
};

export async function uploadPdfToBlob(
  file: File,
  content: string = SAMSUNG_QUARTERLY_REPORT_SAMPLE
): Promise<PdfBlobUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("content", content);

  const res = await fetch("/api/blob/pdf", {
    method: "POST",
    body: formData,
  });

  const data = (await res.json().catch(() => ({}))) as Partial<PdfBlobUploadResult> & {
    detail?: string;
  };

  if (!res.ok) {
    throw new Error(data.detail ?? `PDF 업로드에 실패했습니다. (${res.status})`);
  }

  if (
    typeof data.filename !== "string" ||
    typeof data.url !== "string" ||
    typeof data.content !== "string" ||
    typeof data.contentUrl !== "string"
  ) {
    throw new Error("업로드 응답 형식이 올바르지 않습니다.");
  }

  return {
    filename: data.filename,
    url: data.url,
    content: data.content,
    contentUrl: data.contentUrl,
  };
}
