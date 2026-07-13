---
type: ontology
app: star_craft
---

# 종족 온톨로지 (초보자 메타포)

한 PC에서 흩어져 있던 **비전 툴**을 `star_craft` 허브 아래 **저그(비전)** 로 편입한다.  
코드 경로는 시블링/프론트에 두고, **소속·역할은 허브가 인덱싱**한다.

## 암기 한 줄

| 종족 | 능력 | 한 줄 |
|------|------|--------|
| **저그** | 비전 처리 | 저그 = **눈** (본다) |
| **프로토스** | 자동 보고서 (LLM) | 프로토스 = **입/지성** (말하고 정리한다) |
| **테란** | 시계열 추론 | 테란 = **시계/공장** (시간에 맞춰 계산한다) |

파이프라인 비유: **감지(저그) → 설명(프로토스) → 예측(테란)**

---

## 저그(비전) — 편입된 툴

| 툴 | 경로 | 역할 |
|----|------|------|
| **레나 vision** | `frontend/app/lesson/vision` | 수업 UI — `/lesson/vision` 이미지 업로드·미리보기 |
| **Face YOLO** | `backend/apps/face` | YOLO 얼굴·객체 학습·추론 (CLI train/predict) |

허브 스포크 이름: `vision` (`race: zerg`)  
시드: `POST /hub/seed`  
카탈로그 API: `GET /hub/races`

코드 상수: `star_craft/domain/race_ontology.py` (`ZERG_VISION_TOOLS`)

---

## 프로토스 / 테란

툴 슬롯은 비어 있다. LLM 보고서·시계열 모듈이 준비되면 같은 방식으로 `tools`에 편입한다.

---

## 관련 문서

- [star-craft-pipeline.md](./star-craft-pipeline.md) — 허브 라우팅·Neo4j·pgvector
