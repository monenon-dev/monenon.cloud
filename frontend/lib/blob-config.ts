/** Vercel Blob 인증 — OIDC(권장) 또는 Read-Write Token(레거시) */
export function getBlobAuthError(): string | null {
  const storeId = process.env.BLOB_STORE_ID?.trim();
  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();
  const readWriteToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  const onVercel = process.env.VERCEL === "1";

  if (onVercel && storeId) {
    return null;
  }

  if (!onVercel && readWriteToken) {
    return null;
  }

  if (!onVercel && oidcToken && storeId) {
    return null;
  }

  if (!onVercel) {
    return (
      "로컬 Blob 인증 설정이 필요합니다. " +
      "① Vercel Blob → Projects → com-ragtailor-www 연결 시 Development 체크 " +
      "② cd frontend && vercel env pull .env.vercel 후 VERCEL_OIDC_TOKEN·BLOB_STORE_ID를 .env.local에 추가 " +
      "(신규 스토어는 BLOB_READ_WRITE_TOKEN 없음 — OIDC만 제공)"
    );
  }

  if (!storeId) {
    return "BLOB_STORE_ID가 설정되지 않았습니다. Vercel Blob 스토어를 프로젝트에 연결하세요.";
  }

  return null;
}

type BlobPutExtra = {
  access: "public" | "private";
  contentType?: string;
  addRandomSuffix?: boolean;
};

export function blobPutOptions(extra: BlobPutExtra) {
  const readWriteToken = process.env.BLOB_READ_WRITE_TOKEN?.trim();
  const oidcToken = process.env.VERCEL_OIDC_TOKEN?.trim();
  const storeId = process.env.BLOB_STORE_ID?.trim();
  const onVercel = process.env.VERCEL === "1";

  // 레거시: Read-Write Token (storeId 없이 — OIDC 경로 회피)
  if (!onVercel && readWriteToken) {
    return { ...extra, token: readWriteToken };
  }

  // 로컬·Docker: OIDC (vercel env pull 로 받은 토큰)
  if (!onVercel && oidcToken && storeId) {
    return { ...extra, oidcToken, storeId };
  }

  // Vercel 배포: env 자동 주입
  return storeId ? { ...extra, storeId } : extra;
}
