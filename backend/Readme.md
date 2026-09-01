# com.ragwatson

이 저장소는 **하네스 엔지니어링**을 전제로 한다. 즉, 사람과 AI 코딩 어시스턴트가 같은 **경계(규칙·검증·컨텍스트)** 안에서 움직이도록 문서와 규칙을 쌓아, 안드레 카파시가 반복해서 지적한 실패—**무분별한 가정**, **과한 설계**, **부수적인 코드 손상**—를 줄이는 쪽으로 맞춘다.

**트레이드오프:** 속도보다 신중함. 사소한 작업은 상식으로 완화한다.

## 하네스 문서 한눈에

| 파일 | 역할 |
|------|------|
| [`.cursorrules`](../.cursorrules) | 제품 방향·행동 원칙·Cursor 실행 규칙(검증 고리, diff 경계 등) |
| [`CURSOR.md`](../CURSOR.md) | Cursor IDE에서 사람이 컨텍스트·요청을 어떻게 줄지 |
| (선택) `.cursor/rules/` | 경로·스택별로 규칙을 더 쪼갤 때 |

원칙을 바꿀 때는 **`.cursorrules`부터** 손본 뒤 `CURSOR.md`를 맞춘다. 문서끼리 충돌이 나면 **더 구체적이고 저장소에 가까운 규칙**이 우선한다([`CURSOR.md`](../CURSOR.md)와 동일).

## Cursor로 이 저장소를 쓸 때

1. 작업 전에 [`CURSOR.md`](CURSOR.md)를 훑는다.  
2. 채팅에는 `@`로 필요한 파일·폴더만 붙인다.  
3. “돌아가게” 대신 **검증 가능한 완료 조건**(테스트, 빌드, 재현 절차)을 같이 적는다.

## 설치·실행·검증

프로젝트 스택이 정해지면 여기에 명령을 적는다. 지금은 비워 두었고, [`CURSOR.md`의 표](CURSOR.md)와 같이 채우면 된다.

- 설치: (기입)
- 로컬 실행: (기입)
- 검증: (기입)

## Moneo 오케스트레이션 (브리핑 · 능동 알림)

LangGraph 브리핑, APScheduler cron, Slack/Gmail 연동, 상황 감시형 알림의 구조는 저장소 루트 문서를 참고한다.

- **[`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)** — 그래프 노드 순서, 설계 결정(synthesizer/validator 분리, skip 처리, 24h 억제), Mermaid 데이터 흐름도
- 환경 변수 목록: [`backend/.env.example`](.env.example)

## 출처

행동 가이드의 근간은 카파시의 관찰을 바탕으로 정리된 [forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills)의 `CLAUDE.md`와 같다.
