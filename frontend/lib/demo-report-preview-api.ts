import { getApiBaseUrl } from "@/lib/api-base";

export type DemoReportPreviewResult = {
  narrative: string;
  sample: boolean;
};

export type DemoReportPreviewInput = {
  completed_work?: string;
  meetings?: string;
  pending_items?: string;
};

function readErrorDetail(raw: unknown, fallback: string): string {
  if (
    typeof raw === "object" &&
    raw !== null &&
    "detail" in raw &&
    typeof (raw as { detail: unknown }).detail === "string"
  ) {
    return (raw as { detail: string }).detail;
  }
  return fallback;
}

function parseReportPreviewPayload(raw: unknown): DemoReportPreviewResult {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("응답 형식이 올바르지 않습니다.");
  }
  const data = raw as Record<string, unknown>;
  if (typeof data.narrative !== "string" || !data.narrative.trim()) {
    throw new Error("리포트 본문이 없습니다.");
  }
  return {
    narrative: data.narrative.trim(),
    sample: data.sample === true,
  };
}

export async function fetchDemoReportSample(
  options?: { apiBaseUrl?: string }
): Promise<DemoReportPreviewResult> {
  const base = (options?.apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const res = await fetch(`${base}/demo/report-preview/sample`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const raw: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(readErrorDetail(raw, `샘플 리포트 요청 실패 (${res.status})`));
  }
  return parseReportPreviewPayload(raw);
}

export async function postDemoReportPreview(
  input: DemoReportPreviewInput,
  options?: { apiBaseUrl?: string }
): Promise<DemoReportPreviewResult> {
  const base = (options?.apiBaseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const res = await fetch(`${base}/demo/report-preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      completed_work: (input.completed_work ?? "").trim(),
      meetings: (input.meetings ?? "").trim(),
      pending_items: (input.pending_items ?? "").trim(),
    }),
  });
  const raw: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(readErrorDetail(raw, `리포트 생성 실패 (${res.status})`));
  }
  return parseReportPreviewPayload(raw);
}
