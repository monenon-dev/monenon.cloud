---
type: spoke
app: star_craft
race: zerg
tool: overseer_convnext
links:
  - star-001-pipeline.md
  - ../../_docs/a2a-mcp-pyproject-harness.md
  - ../../_docs/docker-rules.md
---

# Harness: Overseer (Observer Agent) — ConvNeXt Nano 이미지 분류

> Monenon (`monenon.cloud`) · 허브 `star_craft` · 종족 **저그(vision)**  
> 기존 Face YOLO(`zerg/face`)·레나 vision UI와 **나란히** 두는 분류 툴.  
> 템플릿의 `inception` / `dreamscape` / `totem` 이름을 **이 레포 컨벤션**으로 치환한 계약 문서다.

## 목적

ConvNeXt Nano 기반 이미지 분류를 Monenon 백엔드에 통합하고,

1. FastAPI로 `/star-craft/zerg/overseer/...` 에 노출하고  
2. (선택) MCP 도구 `classify_image` 로 Claude Code / 온프레미스 EXAONE 에이전트가 호출 가능하게 한다.

허브 라우팅(`star-001`)에서 이 툴은 스포크 후보 `vision` / `overseer` 키워드와 연결된다.

---

## 실행 원칙 (에이전트 준수)

| 원칙 | Monenon에서의 의미 |
|------|-------------------|
| 아키텍처 | 헥사고날 (`app/ports` ↔ `adapter`), FastAPI, Keymaker |
| 테마 네이밍 | **저그 Overseer** (정찰·분류). Face YOLO / Zerling / Hydralisk와 동일 계층 |
| 레포 | **새 저장소·평행 compose 금지.** `backend/apps/star_craft/zerg/overseer/` 에만 추가 |
| Docker | [`docker-rules.md`](../../_docs/docker-rules.md): 기존 `redis`·`backend` 재사용. **승인 없이** 새 서비스/네트워크 만들지 말 것 |
| MCP 런타임 | [`a2a-mcp-pyproject-harness.md`](../../_docs/a2a-mcp-pyproject-harness.md): 무거운 GPU·Ollama는 **시그마 온프레미스**; 이 레포는 API·어댑터·MCP 래퍼 |
| 진행 | Phase 완료 → diff/테스트 요약 → **승인 후** 다음 Phase (스킵 금지) |
| 수정 범위 | 요청 밖 리팩터·불필요 주석·하드코딩 금지. 포트·경로·모델명은 `.env` / Keymaker |

**금지 치환표 (템플릿 → Monenon)**

| 템플릿 | Monenon |
|--------|---------|
| `inception` 레포 | `monenon.cloud` |
| `inception/services/image-classifier/` | `backend/apps/star_craft/zerg/overseer/` |
| `dreamscape` 네트워크 | 루트 compose 프로젝트 `monenoncloud` (기존 네트워크) |
| `totem` (Redis) | compose `redis` 서비스 + 키 접두사 `star_craft:zerg:overseer:` |
| 포트 `8090` 단독 프로세스 | **기본:** 메인 Uvicorn `:8000` 하위 라우트. 분리 프로세스/포트는 **승인 후**만 |
| `core/ai/vision_convnext.py` | `lol/` 또는 `star_craft` 유스케이스 래퍼 (기존 `lol.ollama` 패턴) |
| `core/lol/` worlds_/rift_ | 해당 없음 → `race_ontology.ZERG_VISION_TOOLS` + (선택) Gateway intent |

---

## 기존 자산 (재사용)

| 자산 | 경로 / 역할 |
|------|-------------|
| 허브 파이프라인 | `_docs/star-001-pipeline.md`, `ContextRoutingUseCase` |
| Face YOLO | `zerg/face/` — 탐지·분류 학습 CLI (YOLO). Overseer는 **ConvNeXt 분류**로 역할 분리 |
| 레나 vision UI | `frontend/app/star-craft/zerg/vision` |
| Redis | `zerg/web` 의 `RedisZergJobConfigAdapter` 패턴 참고 |
| MCP 예시 | `silicon_valley/adapter/inbound/mcp` (`FastMCP`) |
| 종족 카탈로그 | `domain/race_ontology.py` — Phase 1 완료 시 `overseer_convnext` 툴 1줄 추가 |

---

## Phase 1 — 모델 서빙 레이어

### 1.1 서비스 스캐폴딩

- **위치:** `backend/apps/star_craft/zerg/overseer/`
- **구조** (기존 `zerg/face`, `zerg/web` 와 동일 헥사고날):

```text
zerg/overseer/
  domain/                 # ClassifyResult 등
  app/
    ports/
      input/              # ClassifyImageUseCasePort
      output/             # InferenceEnginePort, ClassifyCachePort
    use_cases/            # ClassifyImageInteractor
  adapter/
    inbound/api/v1/       # overseer_router → main star_craft_router 등록
    outbound/
      onnx_runtime_adapter.py
      torch_convnext_adapter.py
      redis_classify_cache_adapter.py
  dependencies/
    providers.py
```

`main.py` / `backend` 이미지에 **라우터만 include**. 별도 `image-classifier` 마이크로서비스 compose 항목은 기본값 아님.

### 1.2 모델 준비

- `timm`으로 `convnext_nano` pretrained 로드
- ONNX export (`torch.onnx.export`) → 아티팩트 경로 env  
  예: `OVERSEER_ONNX_PATH` (기본 `uploads/star_craft/overseer/convnext_nano.onnx` 등 — Keymaker)
- CPU(시그마 N100급): `onnxruntime` + (선택) int8 quantization
- GPU(로컬 Legion 등): `INFERENCE_BACKEND=onnx|torch`  
  - `torch` 시 `torch.compile(mode="reduce-overhead")` 경로 (플래그로만)

가중치·ONNX 바이너리는 **Git에 커밋하지 않음** (`.gitignore` / 볼륨).

### 1.3 FastAPI 엔드포인트

메인 앱에 마운트 (권장):

```text
POST /star-craft/zerg/overseer/classify
  request: multipart image file  (field: file)
  response: { "label": str, "confidence": float, "top5": [{ "label", "confidence" }] }

GET  /star-craft/zerg/overseer/health
```

- 입력 검증: 포맷(JPEG/PNG/WebP), 최대 바이트·해상도 → 실패 시 **한국어** `detail` 4xx
- (승인 시만) 분리 서빙: `OVERSEER_PORT` + 단독 Dockerfile — compose 추가 전 `docker-rules` 체크리스트 보고

### 1.4 인프라 연동

- **네트워크:** 기존 `backend` 컨테이너와 동일 (새 네트워크 금지)
- **캐시:** Redis (`REDIS_URL` / Keymaker)  
  - 키: `star_craft:zerg:overseer:classify:{sha256}`  
  - TTL: `OVERSEER_CACHE_TTL_SEC` (env)
- 동일 이미지 재요청 시 추론 스킵

### 1.5 완료 기준

- [ ] `uvicorn main:app` (또는 시그마 compose backend) 기동
- [ ] `GET /star-craft/zerg/overseer/health` → 200
- [ ] `curl -F file=@sample.jpg http://127.0.0.1:8000/star-craft/zerg/overseer/classify` 분류 응답
- [ ] `race_ontology` / seed 스포크 키워드에 overseer·분류 반영 (최소 문서·카탈로그)

```bash
curl -s http://127.0.0.1:8000/star-craft/zerg/overseer/health
curl -s -X POST http://127.0.0.1:8000/star-craft/zerg/overseer/classify \
  -F "file=@./sample.jpg"
```

---

## Phase 2 — Tool 인터페이스 정의

### 2.1 Tool 스키마

- **위치:** `backend/apps/star_craft/zerg/overseer/tool_schema.json`

```json
{
  "name": "classify_image",
  "description": "이미지를 ConvNeXt Nano(Overseer)로 분류하여 라벨과 신뢰도를 반환한다.",
  "input_schema": {
    "type": "object",
    "properties": {
      "image_path": {
        "type": "string",
        "description": "분류할 이미지 로컬 경로, uploads 상대경로, 또는 URL"
      },
      "top_k": { "type": "integer", "default": 5 }
    },
    "required": ["image_path"]
  }
}
```

### 2.2 LLM / 오케스트레이션 래퍼 (선택)

- 위치 후보: `lol/vision/overseer_convnext.py` **또는** overseer 유스케이스를 Gateway/`faker_orchestrator` 스타일로 감싼 thin 클라이언트
- 역할: schema 파싱 → HTTP `.../overseer/classify` (또는 포트 내 직접 호출) → 에이전트 응답 정규화
- 허브: `ZERG_VISION_TOOLS`에 툴 등록; Gateway intent allowlist에 넣을지는 **별도 승인**

---

## Phase 3 — MCP 서버로 노출

### 3.1 MCP 스캐폴딩

- **위치:** `backend/apps/star_craft/zerg/overseer/adapter/inbound/mcp/`  
  (패턴: `silicon_valley/adapter/inbound/mcp`)
- Python `mcp` / `FastMCP`
- `list_tools` → `classify_image` (`tool_schema.json` 재사용)
- `call_tool` → 내부적으로 Overseer classify 유스케이스 또는 `http://127.0.0.1:8000/star-craft/zerg/overseer/classify` 호출

온프레미스 워커 계약: `a2a-mcp` 하네스의 allowlist에 `vision.classify` 추가 여부를 **문서 PR로 먼저** 제안 (이 파일 links).

### 3.2 로컬 연결

- Claude Code / Cursor MCP 설정에 stdio 또는 SSE로 등록 (기존 monenon MCP와 **transport 통일**)
- 테스트: “이 이미지 분류해줘” → `classify_image` 자동 호출

### 3.3 완료 기준

- [ ] MCP에 `classify_image` 노출
- [ ] 실제 이미지 경로로 호출 시 Phase 1과 동일 스키마 결과

---

## `.env` / Keymaker 키 (예시)

```env
# Overseer (ConvNeXt) — 시크릿 아님, 경로·플래그만
INFERENCE_BACKEND=onnx
OVERSEER_ONNX_PATH=
OVERSEER_CACHE_TTL_SEC=3600
# OVERSEER_PORT=8090   # 분리 서빙 승인 시에만
```

비밀·모델 URL은 Keymaker. 코드 하드코딩 금지.

---

## 산출물 체크리스트

- [ ] `backend/apps/star_craft/zerg/overseer/` 헥사고날 구조
- [ ] ONNX(또는 torch) 로더 + 추론 어댑터
- [ ] `POST .../classify`, `GET .../health`
- [ ] Redis 캐시 어댑터 (`star_craft:zerg:overseer:classify:*`)
- [ ] `tool_schema.json`
- [ ] (선택) `lol` / Gateway 래퍼
- [ ] (선택) MCP `adapter/inbound/mcp`
- [ ] `race_ontology` 툴 항목 + (필요 시) hub seed 키워드
- [ ] 이 문서 Phase별 테스트 결과 메모 (채팅 또는 PR)

**하지 않음 (기본)**

- [ ] 새 Git 레포 / `services/image-classifier` 평행 트리
- [ ] 승인 없는 `docker-compose` 서비스·네트워크 추가
- [ ] Face YOLO 코드를 ConvNeXt로 치환하는 대규모 리팩터

---

## 진행 방식

```text
Phase 1 → 승인 → Phase 2 → 승인 → Phase 3
```

각 Phase 끝:

1. 변경 파일 목록  
2. curl / MCP 테스트 결과  
3. 다음 Phase 진행 여부 질문  

상위 규칙: `.cursorrules` · `BACKEND_RULES.md` · `star-001-pipeline.md` · `a2a-mcp-pyproject-harness.md`
