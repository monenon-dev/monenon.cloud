---
name: auto-memory-mechanics
description: Cursor에서의 자동·수동 메모리 동작 — Rules/Skills/@/Read와 memory/ 인덱스 역할
metadata:
  type: reference
---

# 자동 메모리 동작 방식 (Cursor)

Claude Code의 “MEMORY.md 첫 200줄 자동 로드”와 **다르다.**  
이 저장소의 `memory/`는 Cursor 도구에 맞춰 **수동·규칙 기반**으로 쓰는 프로젝트 메모다.

## Cursor가 세션에 실제로 넣는 것

| 계층 | 경로 / 수단 | 로드 방식 |
|------|-------------|-----------|
| 루트 하네스 | `.cursorrules` | 워크스페이스 규칙으로 **상시** 참고 |
| 프로젝트 Rules | `.cursor/rules/*.mdc` | `alwaysApply: true` → 매 채팅 주입 / `globs` → 해당 파일 작업 시 |
| Skills | `.cursor/skills/*/SKILL.md` | 설명과 맞으면 에이전트가 읽고 따름 (또는 사용자가 스킬을 지정) |
| 사용자 @ | 채팅에서 `@파일` `@폴더` | **그 턴에만** 컨텍스트로 첨부 |
| 도구 Read / Grep | Agent가 파일 열기 | 필요할 때 **온디맨드** |
| 과거 대화 | Agent transcripts | 자동 전부 로드되지 않음. 필요할 때 검색·인용 |
| MCP | `.cursor/mcp.json` | 연결된 서버 도구만. 별도 “기억 DB”가 없으면 세션 간 자동 기억 없음 |

**정리:** Cursor에는 Claude Code식 `MEMORY.md` 자동 주입이 **없다.**  
오래 남을 지시는 **Rules**, 절차는 **Skills**, 사실·결정 메모는 **`memory/` 주제 파일** + 에이전트 `Read`로 다룬다.

## `memory/MEMORY.md`의 역할

- **인덱스만** 둔다. 항목당 한 줄: 제목 + 상대 링크 + “언제 열지” 훅.
- 상세는 `auto-memory-mechanics.md`처럼 **주제 파일**로 분리한다.
- 주제 파일은 세션 시작 시 자동으로 안 들어간다. 훅이 맞거나 사용자가 `@memory/...` 할 때, 또는 에이전트가 `Read`할 때 로드된다.
- 인덱스를 길게 쓰면 Rules·채팅 토큰을 잠식한다. Claude의 “200줄” 한도는 Cursor에 없지만, **짧게 유지하는 원칙은 동일**하다.

## `.cursorrules` / Rules와의 차이

| | `.cursorrules` · `.cursor/rules` | `memory/` |
|--|----------------------------------|-----------|
| 목적 | 행동·코딩·제품 **지시** | 세션 간 **사실·함정·결정** 메모 |
| 로드 | alwaysApply / globs로 자동 | 인덱스·주제 파일은 기본적으로 수동 |
| 길이 | 길면 매 턴 비용 | 주제 파일은 길어도 자동 비용 없음 |

지시사항은 Rules에 두고, “지난번에 확인한 사실”은 `memory/`에 둔다. 둘을 섞지 않는다.

## 에이전트가 따를 절차 (Cursor 도구)

1. 복잡한 작업·재개·“예전에 뭐였지”류 질문이면 먼저 `Read`로 `memory/MEMORY.md`를 본다.
2. 훅이 맞으면 링크된 주제 파일만 `Read`한다. 인덱스 전체를 주제 파일로 바꾸지 않는다.
3. 새 사실을 남길 때는 **주제 파일**에 쓰고, `MEMORY.md`에는 한 줄 인덱스만 추가한다.
4. 사용자가 `@memory/MEMORY.md` 또는 `@memory/<주제>.md`를 붙이면 그걸 우선한다.

## 이 규칙에서 따라오는 작성 원칙

- `MEMORY.md`는 인덱스로만 쓴다. 본문을 여기에 적지 않는다.
- 훅은 “이 파일을 열어야 할지” 바로 판단되게 쓴다. 열어봐야 아는 문구는 쓰지 않는다.
- 오래되거나 틀린 항목은 지운다. 줄 수를 줄이려고 훅만 지우지 않는다.
- 비밀·키·토큰은 `memory/`에 적지 않는다 (`.env` + Keymaker, `.cursor/rules/secrets-keymaker.mdc`).

## 이 저장소 현재 상태

- `memory/MEMORY.md` — 인덱스
- `memory/auto-memory-mechanics.md` — 본 문서 (Cursor 메모리 계층 설명)
- 상시 지시: `.cursorrules`, `.cursor/rules/*` (`alwaysApply` / `globs`)
- 외부 MCP 기억 서버는 기본 설정에 없음 (`.cursor/mcp.json`의 hermes 등과 별개)

관련: [MEMORY.md](MEMORY.md)
