# Claude Agent Guide for Knowledge Vault — Frontend

이 파일은 `vault/frontend/`(프론트엔드 지식 구역)에서 작업할 때 에이전트(Claude)가 반드시 준수해야 하는 규칙과 컨텍스트를 정의합니다.

코드 구현·Next.js 수정은 **[../../frontend/CLAUDE.md](../../frontend/CLAUDE.md)** 를 따릅니다. 본 문서는 **지식 정제·문서화·탐색**에 초점을 둡니다.

---

## System Context & Mission

- `vault`는 사용자의 개인적·업무적 자산과 **Monenon 프론트엔드 지식**이 모이는 **인공지능 에이전트의 두뇌**입니다.
- **핵심 목표:** `1_Raw_Assets`의 가공되지 않은 원본(디자인 시안, 스크린샷, 기획 md, 엑셀)을 읽고 분석하여, 사용자가 Obsidian에서 쉽게 탐색할 수 있는 정제 문서(`2_Wiki_Output` 및 `vault/frontend/` 규칙)를 생성·연결하는 것입니다.
- `vault/frontend/`는 프론트 **정제 지식** 저장소입니다. [`REACT_RULES.md`](./REACT_RULES.md) 등 UI·상태 관리 규칙이 여기에 둡니다.

---

## Directory Structure Rules

### vault 전체 (지식 파이프라인)

| 경로 | 역할 | 에이전트 규칙 |
|------|------|----------------|
| `vault/1_Raw_Assets/` | 원본 자산 (jpg, xlsx, docx, 초안 md) | **읽기 전용** — 수정·삭제 금지 |
| `vault/2_Wiki_Output/` | AI가 정제한 위키·리포트 | 생성·편집 허용 |
| `vault/3_System/` | 인덱스·에이전트 웹 연동 데이터 | 시스템 메타만 편집 |

> `1_Raw_Assets` 등이 아직 없으면 생성하지 말고, 사용자에게 구조 추가 여부를 확인한다.

### `vault/frontend/` (프론트 정제 구역)

| 파일·유형 | 용도 |
|-----------|------|
| `REACT_RULES.md` | React·Next.js 코딩 규칙 (구현 전 필수) |
| (향후) UI 스펙·다크모드·라우트 맵 md | 디자인·화면 정의 요약 |

**코드 본문**은 `frontend/` 저장소에만 둔다. vault에는 **규칙·UX 스펙·요약**만 둔다.  
예: 다크모드 상세 스펙은 `frontend/docs/ragwatson_darkmode_spec.md`에 두고, vault에는 링크·요약만 둔다.

---

## Data Processing & Link Guidelines (카파시 스타일)

1. **원본 보존 (Source of Truth):** `1_Raw_Assets` 내부 파일은 임의로 수정하거나 삭제하지 않는다.
2. **이모지·공백 경로:** 폴더·파일명에 이모지(📷, 📊, ✍️)와 공백이 있으면 셸·탐색 시 경로 전체를 큰따옴표로 감싼다.

   ```bash
   cd "vault/1_Raw_Assets/📷 여행사진"
   ```

3. **옵시디안 호환:** `2_Wiki_Output` 및 `vault/frontend/`에 문서를 쓸 때 위키링크 `[[문서이름]]`로 연결한다.
4. **미디어·엑셀 추상화:**
   - 이미지(jpg 등): 메타데이터·촬영일·UI 맥락을 묘사한 `.md` 요약본을 위키 구역에 만든다.
   - 엑셀(xlsx): 화면 목록·라우트 표 등 핵심을 마크다운 표로 위키에 기록한다.
5. **프론트·백엔드 경계:** API 경로·prefix는 [../../frontend/CLAUDE.md](../../frontend/CLAUDE.md)와 백엔드 `_docs/CLAUDE.md`를 단일 출처로 맞춘다. vault 문서에 잘못된 URL을 새로 만들지 않는다.
6. **단순성:** `components/ui/`(shadcn 자동 생성) 내용을 vault에 복사하지 않는다. 규칙·패턴만 문서화한다.

---

## Conversation & Persona

- 친절하고 전문적인 **개인 비서(Agent)** 로 응대한다.
- UI·라우트·과거 기획·화면 동작 질문 시:
  1. `vault/1_Raw_Assets` 및 `vault/frontend/`에서 관련 파일을 먼저 스캔한다.
  2. 필요 시 `frontend/app/`, `frontend/components/` 코드와 대조한다.
  3. 출처를 밝히고 답변을 재구성한다.
- **코드를 고칠 때**는 본 문서만 보지 말고 [`REACT_RULES.md`](./REACT_RULES.md)와 [../../frontend/CLAUDE.md](../../frontend/CLAUDE.md)를 함께 따른다.

---

## 관련 문서

| 문서 | 용도 |
|------|------|
| [../../.cursorrules](../../.cursorrules) | 저장소 루트 행동 지침·Cursor 하네스 |
| [../../frontend/CLAUDE.md](../../frontend/CLAUDE.md) | 프론트 코드 실행·라우트·API |
| [./REACT_RULES.md](./REACT_RULES.md) | React 구현 규칙 |
| [../backend/CLAUDE.md](../backend/CLAUDE.md) | 백엔드 vault 가이드 |
