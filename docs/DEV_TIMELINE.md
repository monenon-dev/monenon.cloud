# 개발 여정 (DEV_TIMELINE)

> 작성 기준: GitHub `monenon-dev` · 조직 `T-Chef` · `Bit-gram` 리포 커밋·README 검증 (2026-08-13)  
> 로컬 클론: `/home/monenon/academy-repos` (일부는 API로 히스토리 수집)  
> 과장 없이 **커밋·문서에 보이는 사실**만 기록한다.

---

## 커밋 히스토리 요약표

| 시기 | 리포 | 첫 커밋 | 마지막 커밋 | 커밋 수 | 주요 작성자 |
|------|------|---------|-------------|---------|-------------|
| 1차 | `monenon-dev/java-study` | 2025-07-17 | 2025-09-09 | 19 | CHOSEOHEE |
| 1차 | `monenon-dev/rockey-practices` | 2025-08-06 | 2025-08-11 | 17 | CHOSEOHEE |
| 1차 | `monenon-dev/mariadb-practices` | 2025-08-18 | 2025-09-09 | 21 | CHOSEOHEE |
| 1차 | `monenon-dev/servlet-practices` | 2025-08-21 | 2025-09-19 | 10 | CHOSEOHEE |
| 1차 | `monenon-dev/mysite` | 2025-08-25 | 2025-09-25 | 23 | CHOSEOHEE |
| 1차 | `monenon-dev/spring-prctices` | 2025-09-01 | 2025-09-25 | 13 | CHOSEOHEE |
| 1차 | `monenon-dev/springboot-practices` | 2025-09-22 | 2025-09-22 | 3 | CHOSEOHEE |
| 1차 | `monenon-dev/spring-security-practices` | 2025-09-17 | 2025-09-19 | 2 | (소량) |
| 1차 후반 | `frontend-dev-basics` | 2025-10-01 | 2025-10-23 | 13 | — |
| 1차 후반 | `node-practices` | 2025-10-17 | 2025-10-17 | 3 | — |
| 1차 후반 | `react-practices` | 2025-10-23 | 2025-11-07 | 14 | — |
| 팀 | `T-Chef/trip-diner` | 2025-11-11 | 2026-01-08 | **87** | ri1700 75 · jinho3085 11 · kimjuhan-95 1 |
| 팀 | `Bit-gram/bitgram-backend` | 2026-02-05 | 2026-02-11 | 4 | Yuna_H · sung9920 |
| 팀 | `Bit-gram/bitgram-frontend` | 2026-02-05 | 2026-02-11 | 4 | Yuna_H · juhan |
| 2차 | `monenon-dev/jbsilverconnect` | 2026-06-11 | 2026-06-12 | 8 | jangminseok 7 · monenon/monenon-dev 1 |
| 2차 | `monenon-dev/pawprint` | 2026-06-24 | 2026-06-26 | 5 | monenon-dev · CHOSEOHEE |
| 2차 | `monenon-dev/monenon.cloud` | 2026-07-08* | 2026-08-13 | **~201** | 모네난 · Cursor Agent · monenon-dev |

\* `monenon.cloud` 현재 히스토리의 가장 이른 커밋은 모노레포 통합(`chore: monenon.cloud 단일 저장소로 통합`). 이전 작업은 통합 전에 분산됐을 수 있음.

**계정 메모:** 1차 실습 커밋 author는 주로 `CHOSEOHEE`(`whtjgml2002@naver.com`). `trip-diner` 대량 커밋은 `ri1700`. `monenon-dev`·`ri1700` 모두 `T-Chef` / `Bit-gram` 조직 멤버이다. 아래 trip-diner 본인 담당 추정은 **`ri1700` 커밋·변경 파일 패턴**을 기준으로 한다.

---

## 1. 1차 과정 — 클라우드 자바 백엔드 기초

**전체 기간 (커밋 기준):** 약 **2025-07 ~ 2025-11**  
(Java/DB/Servlet/Spring 중심 7~9월 → 10~11월 프론트 기초 실습으로 이어짐)

**다룬 기술 스택**

- Java, 네트워크·스레드·컬렉션 등 언어/기초 (`java-study`)
- Rocky Linux 환경 구축(Java, Tomcat, Maven, MariaDB, Git) (`rockey-practices`)
- MariaDB / SQL · bookmall·bookshop 등 JDBC 실습 (`mariadb-practices`)
- Servlet / JSP 웹앱 (`servlet-practices`, `mysite` 시리즈)
- Spring IoC·Bean wiring·Thymeleaf (`spring-prctices`)
- Spring Boot · Security 맛보기 (`springboot-practices`, `spring-security-practices`)
- 이후 HTML/프론트·Node·React 입문 (`frontend-dev-basics`, `node-practices`, `react-practices`)

### 리포별 요약

| 리포 | 한 줄 |
|------|--------|
| **java-study** | 클래스·제네릭·컬렉션·스레드·네트워크 HTML까지 Java 기초를 단계적으로 마무리한 학습 리포. |
| **rockey-practices** | 클라우드/서버 실습용 Rocky 환경 설치 노트를 Markdown으로 정리 (Java·Tomcat·Maven·MariaDB). |
| **mariadb-practices** | SQL·웹DB·Email·bookshop/bookmall 모델까지 DB·JDBC 실습. |
| **servlet-practices** | `helloweb`부터 Servlet 웹 기본기를 쌓은 소규모 실습. |
| **mysite** | mysite02~07까지 게시판·로그 예제 등 **통합 웹사이트**를 반복 개선한 메인 실습작. |
| **spring-prctices** | Spring bean wiring · locale · Thymeleaf 뷰 학습. |
| **springboot-practices** | Spring Boot 예제·설정 마무리 (커밋 소수). |
| **react/node/frontend-*** | 백엔드 기초 이후 프론트·빌드 도구로 스택을 넓힌 후반 실습. |

---

## 2. 팀 프로젝트

### 2-1. Trip-Dinner (`T-Chef/trip-diner`) — 수료 완주작

**한 줄:** 도시·일정·장소·커뮤니티·Q&A를 묶은 **종합 여행 플랫폼** (README: “보는 순간 설레는 여행 메뉴판”).

| 항목 | 내용 |
|------|------|
| 기간 | **2025-11-11 → 2026-01-08** (약 2개월) |
| 커밋 | **87건** |
| 참여 (커밋 작성자) | `ri1700`(75), `jinho3085`(11), `kimjuhan-95`(1) — PR `#1` 등 협업 흔적 |
| 스택 (README) | Node.js / Express · Prisma · MySQL · JWT · React |
| 상태 | **처음부터 마지막 수정(관리자·문의)까지 커밋이 이어진 완주 프로젝트** |

**서비스 내용 (README)**

- PLAN → DAY → ITEM 구조의 여행 일정
- CITY / PLACE, 리뷰·좋아요
- 게시판·댓글(대댓글)·신고
- Q&A(대기/완료) · 관리자 답변
- AI 기록 테이블 등 확장 포인트

**본인 담당 추정 (`ri1700` 커밋·파일 기준)**

초기 React 구조·라우터·DB 연동·로그인/회원가입부터 시작해, 후반에는 **관리자·문의(Q&A)·게시판·좋아요·프로필** 쪽에 커밋이 몰린다.

예시:

- `관리자 추가` → `back/middleware/adminAuth.js`, `AdminDashboard.jsx`, `AdminLogin.jsx` 등
- `문의하기 추가` → `adminQnA.js`, `UserQnA.jsx`, `AdminQnA.jsx`, 마이페이지 QnA
- 메시지 패턴: `관리자 수정 완료`, `문의하기 수정완료`, `게시판 수정`, `좋아요 게시글 업데이트`, `프로필 수정완료`

팀원 `jinho3085`는 City 페이지·메인·SideMenu·레이아웃 등 **프론트 탐색/레이아웃** 쪽이 두드러진다.

> `monenon-dev/Trip-diner-main`에는 Initial commit 1건만 있다. **실질 완주 히스토리는 `T-Chef/trip-diner`.**

### 2-2. Bitgram (`Bit-gram/*`) — 중도 정리

Instagram 클론을 목표로 한 팀 프로젝트.  
백엔드: Spring Boot 4 + JPA + Redis 스캐폴딩 (`bitgram-backend` description: *Instagram Clone Coding - Backend*).  
프론트: React + Vite 초기화 (`bitgram-frontend`).

**기간:** 2026-02-05 ~ 2026-02-11 (약 1주, 커밋 각 4건 수준).  
초기 설정·PR 템플릿·`.coderabbit.yaml` 등 협업 기반을 깔다 **기능 구현 단계 이전에 커밋이 멈춘 상태**로 남아 있다. 짧은 시도로 담백히 기록한다.

---

## 3. 2차 과정 — AI 에이전트 개발 (현재)

**기간:** 2026-06 ~ (진행 중)  
**방향:** Python/FastAPI · Next.js · LLM/에이전트 오케스트레이션

### 3-1. Moneo — `monenon.cloud`

AI 업무 오케스트레이션 웹앱. Live: [https://www.monenon.cloud](https://www.monenon.cloud)

**커밋으로 확인되는 핵심 마일스톤**

| 시기 | 마일스톤 |
|------|----------|
| 2026-07 | 모노레포 통합, Vercel 연동, Moneo 로고·다크 SaaS 톤·소셜 로그인 UI |
| 2026-07 | LangGraph 데모(`/demo`), lifestyle→orchestration 리네임, Ollama/Docker·Neo4j compose |
| 2026-08-12 | **능동 브리핑** LangGraph · Tool Stream · Slack/Gmail 연동 · 주간 리포트 · Watcher · 브리핑 알림 |
| 2026-08-13 | validator HITL · eval 15/15 · Gmail OAuth 수정 · 인앱 알림 벨 · 현황/README 문서 |

**스택 (실제):** Next.js/React/TS · FastAPI · PostgreSQL · LangGraph · Gemini · APScheduler · 프론트 Vercel · API Docker+Cloudflare Tunnel  
(Railway는 과거 URL 정규화 커밋만 있고, **현재 배포 기준은 Vercel+Tunnel** — `docs/PROJECT_STATUS.md` 참고)

### 3-2. 발자국 — `pawprint`

반려견 동반 여행 플래너(해커톤 시나리오 문서: 애견 LLM **「코코」**, 문화시설·펫프렌들리 장소 필터).

| 항목 | 내용 |
|------|------|
| 기간 | 2026-06-24 ~ 06-26 (커밋 5건) |
| 구성 | Next 랜딩 + `cloud.adapdog` FastAPI/Neon + CSV 공공데이터 |
| 커밋 | 시나리오 반영 홈페이지 수정 중심 |

**검증 메모:** 요청에 있던 “온디바이스 Qwen2.5 / YOLO11”은 **이 리포 코드·문서에서 확인되지 않았다.** 현재 근거는 시나리오/랜딩·백엔드 골격·반려동물 문화시설 데이터 연동 계획이다.

### 3-3. JB SilverConnect — `jbsilverconnect`

노년층 대상 **AI 시니어 안심 금융** 데모 백엔드(헥사고날·DDD).  
컨텍스트: 저축 제안 · 번호표 · 피싱 점검 · 일일 브리핑 · 지점 찾기 · 이자 리포트 (`jb/ARCHITECTURE.md`).  
프론트: `www` / `teller` (Next).

커밋은 주로 `jangminseok`이 초기 구조를 올리고, `monenon-dev`가 후속 커밋 1건을 남긴 **팀/과정 공유 저장소** 성격이다.

---

## 4. 성장 흐름

2025년 중반, Rocky·Java·MariaDB·Servlet·Spring으로 **서버 사이드 웹의 기본기**를 쌓았다.  
같은 해 말 `trip-diner`에서 Node/React 풀스택으로 **팀과 끝까지 기능을 닫아 본 경험**(관리자·QnA·커뮤니티)을 남겼고, Bitgram은 짧은 킥오프에서 멈췄다.  
2026년 중반부터는 FastAPI·Next·LLM으로 영역을 옮겨, 해커톤형 `pawprint`·시니어 금융 `jbsilverconnect`를 거쳐 **`monenon.cloud`에서 LangGraph 멀티에이전트·연동·능동 알림**까지 운영 가능한 제품 형태로 밀고 있다.  
한 줄로 말하면, **백엔드 기초 → 팀 완주 → AI 에이전트 제품**으로 스택과 책임 범위가 넓어진 경로다.

---

## 5. 프로필 README용 요약 (복붙용)

```text
클라우드 자바 백엔드 과정에서 Java · Servlet · MariaDB · Spring 기초를 익히고,
팀 프로젝트 Trip-Dinner(여행 일정·커뮤니티·Q&A)를 약 2개월간 완주했습니다.
(관리자·문의·게시판 등 백엔드/프론트 기능을 커밋으로 이어 갔습니다.)
이후 AI 에이전트 과정에서 FastAPI · Next.js · LangGraph 기반으로
Moneo(업무 브리핑·능동 알림)를 중심으로 제품을 키우고 있습니다.
백엔드 기초 → 팀 완주 경험 → AI 오케스트레이션으로 영역을 확장 중입니다.
```

---

## 부록 — 주요 커밋 메시지 샘플

**1차 `mysite`:** `board finish` · `mysite03 #finish` … `mysite07`  
**1차 `spring-prctices`:** `bean-wiring finish` · `thymeleaf`  
**trip-diner:** `React 초기` · `로그인, 회원가입 완료` · `관리자 추가` · `문의하기 추가` · `전체 수정 완료`  
**bitgram:** `feat: Bitgram Init 설정` · PR 템플릿  
**pawprint:** `Initial commit from Create Next App` · `새로운 시나리오 대입한 홈페이지 수정`  
**monenon.cloud:** `능동적 브리핑: LangGraph…` · `능동 알림: 상황 감지 watcher…` · `인앱 알림…`

관련 문서: [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md) · 루트 [`README.md`](../README.md)
