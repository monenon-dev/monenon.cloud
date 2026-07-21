# 프롬프트 · abc.com 로그인 UI (실행용)

아래 프롬프트를 그대로 적용해 구현한다.

---

## 프롬프트

```text
abc.com 프론트엔드에 eGovFrame 스타일 로그인 화면을 만든다.

[진입]
- 우측 상단 「로그인」 클릭 → 로그인 페이지로 이동 (모달 또는 /abc/login).
- 첫 페인트에 로그인 UI가 바로 보여야 한다. OAuth SDK 로딩을 기다리지 않는다.

[화면]
- 로고: 「abc.com」 (e 강조 느낌의 브랜드 타이포).
- 탭: 일반 | 기업 | 업무 (기본 활성: 일반).
- 입력: 아이디, 비밀번호, 「아이디 저장」 체크.
- 버튼: 「로그인」 (진한 파랑, full width).
- 링크: 회원가입 | 인증서로그인 | 인증서안내.
- 소셜: 네이버, 카카오, 구글, 애플, 인스타그램 버튼을 모두 UI로 배치.
  (브랜드 색: 네이버 초록 / 카카오 노랑 / 구글 연파랑 / 애플 검정 / 인스타 그라데이션).

[백엔드 — 개발자 편의로 1개만 연결]
- Base URL: http://api.abc.com (env: NEXT_PUBLIC_ABC_API_BASE, 기본값 동일).
- 연결하는 것은 「일반」 탭의 아이디·비밀번호 로그인만.
- POST {API}/auth/login  JSON: { "username", "password", "user_type": "general"|"biz"|"work" }
- 소셜 5종은 화면만 제공하고, 클릭 시 「준비 중」 인라인 메시지 (리다이렉트·SDK 금지).
- useState는 UI 메타 단일 객체, 폼 값은 FormData. alert() 금지.

[규칙]
@frontend/_docs/REACT_RULES.md
요청 범위 밖 인증 서버·OAuth 앱 등록·새 compose 금지.
```

---

## 구현 위치

| 경로 | 역할 |
|------|------|
| `frontend/app/abc/page.tsx` | 랜딩 + 우측 상단 로그인 |
| `frontend/app/abc/login/page.tsx` | 로그인 UI |
| `frontend/lib/abc-api.ts` | `http://api.abc.com` 일반 로그인 클라이언트 |
