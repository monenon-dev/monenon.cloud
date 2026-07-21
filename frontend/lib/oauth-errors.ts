const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  "oauth-cancelled": "소셜 로그인이 취소되었습니다.",
  "oauth-state-mismatch": "로그인 세션이 만료되었습니다. 다시 시도해 주세요.",
  "oauth-invalid-response": "로그인 응답이 올바르지 않습니다. 다시 시도해 주세요.",
  "api-unreachable": "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
  "naver-not-configured": "네이버 로그인이 아직 설정되지 않았습니다.",
  "kakao-not-configured": "카카오 로그인이 아직 설정되지 않았습니다.",
  invalid_scope: "카카오 동의 항목(scope) 설정이 맞지 않습니다. 카카오 개발자 콘솔에서 이메일·닉네임 동의를 활성화해 주세요.",
  access_denied: "소셜 로그인 동의가 취소되었습니다.",
};

export function formatOAuthError(raw: string | null): string | null {
  if (!raw) return null;
  return OAUTH_ERROR_MESSAGES[raw] ?? decodeURIComponent(raw);
}
