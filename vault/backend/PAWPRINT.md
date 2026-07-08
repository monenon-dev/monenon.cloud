# 발자국(AdapDog) 프로젝트 ERD 명세서

## 1. 개요
* **목표**: 반려동물 동반 플랫폼 데이터 모델링
* **기준**: 3NF 정규화 준수
* **다이어그램**: [Mermaid](#2-erd-다이어그램)

---

## 2. ERD 다이어그램

```mermaid
erDiagram
    %% ───────────── 공유 차원 (자기참조 계층) ─────────────
    region {
        int id PK "지역 ID"
        string name "지역명"
        int level "단계(1=시도 2=시군구)"
        int parent_id FK "상위 지역(nullable)"
    }
    category {
        int id PK "분류 ID"
        string name "분류명"
        int level "단계(1=대 2=중 3=소)"
        int parent_id FK "상위 분류(nullable)"
    }
    %% ───────────── 시설 (map) ─────────────
    facility {
        int id PK "시설 ID"
        string name "시설명"
        float latitude "위도"
        float longitude "경도"
        int region_id FK "지역(nullable)"
        int category_id FK "분류(nullable)"
        string road_address "도로명주소"
        string jibun_address "지번주소"
        string phone "전화번호"
        string operating_hours "운영시간"
        string homepage "예약/홈페이지 URL"
    }
    facility_pet_policy {
        int facility_id PK,FK "시설"
        bool companion_allowed "동반 가능 여부"
        string restriction "제한사항"
        string extra_fee "추가 요금"
        bool indoor "실내 여부"
        bool outdoor "실외 여부"
    }
    facility_allowed_pet_size {
        int facility_id PK,FK "시설"
        string pet_size PK "허용 크기"
    }
    %% ───────────── 배리어프리 시설 ─────────────
    barrier_free_facility {
        int id PK "시설 ID"
        string name "시설명"
        float latitude "위도"
        float longitude "경도"
        int region_id FK "지역(nullable)"
        int category_id FK "분류(nullable)"
        string road_address "도로명주소"
    }
    barrier_free_feature {
        int facility_id PK,FK "시설"
        string feature_code PK "이동약자 배려 요소 코드"
    }
    %% ───────────── 사용자 / 반려동물 ─────────────
    account {
        int id PK "회원 ID"
        string email UK "이메일(고유)"
        string password_hash "비밀번호 해시"
        string nickname "닉네임"
        datetime created_at "가입일시"
    }
    pet {
        int id PK "반려동물 ID"
        int account_id FK "회원"
        string breed "견종"
        string name "이름"
        string photo_url "사진 URL"
        string size "크기(개체값)"
        string temperament "기질(개체값)"
        int birth_year "출생연도(nullable)"
        string gender "성별"
        string features "특징(자유서술 nullable)"
    }
    pet_trait {
        int pet_id PK,FK "반려동물"
        string trait PK "체질"
    }
    %% ───────────── 견종 카탈로그 ─────────────
    breed_catalog {
        string breed PK "견종(정규화 키)"
        string size "표준 크기"
        string temperament "표준 기질"
    }
    breed_catalog_trait {
        string breed PK,FK "견종"
        string trait PK "체질"
    }
    %% ───────────── 소셜 확장 (예정) ─────────────
    favorite {
        int account_id PK,FK "회원"
        int facility_id PK,FK "시설"
        datetime created_at "추가일시"
    }
    review {
        int id PK "리뷰 ID"
        int account_id FK "회원"
        int facility_id FK "시설"
        int rating "평점(1~5)"
        string comment "내용"
        datetime created_at "작성일시"
    }
    pet_activity {
        int id PK "행동 ID"
        int pet_id FK "반려동물"
        int facility_id FK "시설"
        string action_type "행동 유형"
        datetime occurred_at "발생 시각"
    }

    %% 관계 생략 (Markdown 렌더링 최적화)