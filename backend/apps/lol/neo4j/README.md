# lol/neo4j — Sandbox ↔ AuraDB

`get_driver()` 는 `NEO4J_URI` 를 **그대로** `AsyncGraphDatabase.driver()` 에 넘긴다.  
스킴별 `if` / `encrypted=` 하드코딩이 없으므로 **코드 수정 없이** 환경만 바꿔 쓴다.

| 환경 | `NEO4J_URI` 예 |
|------|----------------|
| Sandbox | `bolt://<ip>:7687` (TLS 없음, 단기) |
| AuraDB | `neo4j+s://xxxx.databases.neo4j.io` (TLS 내장) |
| Docker compose | `bolt://neo4j:7687` (컨테이너 네트워크) |
| 로컬 venv + compose neo4j | `bolt://localhost:7687` |

## 전환 방법

1. `backend/.env` 의 `NEO4J_URI` / `NEO4J_USER` / `NEO4J_PASSWORD` 만 교체
2. `driver.py` · `star_craft` 코드는 수정하지 않음
3. 확인:

```bash
cd backend
source .venv/bin/activate
PYTHONPATH=.:apps python3 -m lol.scripts.check_neo4j
```

출력에 `neo4j scheme: bolt` 또는 `neo4j+s` 가 보이면 어떤 환경에 붙었는지 확인 가능.

## Docker compose 주의

`docker-compose.yaml` 의 backend `environment` 가 `NEO4J_URI=bolt://neo4j:7687` 로 **덮어쓸 수 있다**.  
AuraDB / Sandbox 를 컨테이너에서 쓰려면 compose 의 해당 줄을 `${NEO4J_URI:-bolt://neo4j:7687}` 처럼 바꾸거나, 로컬은 venv + `.env` 로 검증한다.

## 실패 시

`driver.py` 상단 체크리스트 참고 (Sandbox 만료, Aura pause, 방화벽 7687, `.env` 로드).
