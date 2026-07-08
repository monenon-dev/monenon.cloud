/** 추천 태그 자동 전송 중복 방지 (React Strict Mode 대응) */

let inflightPrompt: string | null = null;

export function tryAcquireStarterSend(prompt: string): boolean {
  if (inflightPrompt === prompt) return false;
  inflightPrompt = prompt;
  return true;
}

export function releaseStarterSend(prompt: string): void {
  if (inflightPrompt === prompt) inflightPrompt = null;
}
