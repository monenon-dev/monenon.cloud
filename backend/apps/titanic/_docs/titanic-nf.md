# 🚢 Titanic Project: Database Design & Test Harness Guide

본 문서는 타이타닉 데이터셋(`titanic.csv`)을 데이터베이스에 적재할 때, 도메인 컨셉을 극대화하고 머신러닝 파이프라인과의 정렬을 위해 **미니 3NF(2개 테이블)** 구조로 분리하여 설계한 명세서 및 하네스(Harness) 검증 가이드입니다.

---

## 1. 데이터베이스 논리 모델 (Logical Data Model)

전체 데이터를 한 테이블에 밀어 넣는 대신, **순수 승객 정보(개인 존엄성)**와 **Caledon 가문이 통제하는 자본/티켓 정보**를 명확히 분리합니다.

### 👤 [passengers 테이블]
> **Jack, Rose 본인들의 고유한 인적 정보**를 담는 테이블입니다. `Sex` 대신 보다 현대적이고 정제된 표현인 `gender`를 사용합니다.

| 컬럼명 (Column) | 타입 (Type) | 제약조건 (Constraint) | 설명 (Description) |
| :--- | :--- | :--- | :--- |
| **passenger_id** | VARCHAR | **PRIMARY KEY** | Kaggle 원본 PassengerId |
| **name** | VARCHAR | NULLABLE | 승객 전체 이름 (예: `Jack Dawson`) |
| **gender** | VARCHAR | NULLABLE | 성별 (`male` 또는 `female`) |
| **age** | VARCHAR | NULLABLE | 나이 (문자열로 저장) |
| **sib_sp** | VARCHAR | NULLABLE | 형제자매·배우자 수 |
| **parch** | VARCHAR | NULLABLE | 부모·자녀 수 |
| **survived** | VARCHAR | NULLABLE | 생존 여부 (`"0"` = 사망, `"1"` = 생존, NULL = test set) |

### 🎟️ [bookings 테이블]
> **티켓 등급, 요금, 객실, 승선항** 등 자본 및 환경과 결합된 정보가 기록되는 테이블입니다. `CaledonValidation`이 집중적으로 검증할 영역입니다.

| 컬럼명 (Column) | 타입 (Type) | 제약조건 (Constraint) | 설명 (Description) |
| :--- | :--- | :--- | :--- |
| **id** | INTEGER | **PRIMARY KEY, AUTO_INC** | 티켓 매핑 고유 ID |
| **passenger_id** | VARCHAR | **FOREIGN KEY** (→ passengers.passenger_id) | 해당 티켓을 소유한 승객 ID |
| **pclass** | VARCHAR | NULLABLE | 티켓 등급 (`"1"` / `"2"` / `"3"`) |
| **ticket** | VARCHAR | NULLABLE | 티켓 번호 (알파벳+숫자 혼용) |
| **fare** | VARCHAR | NULLABLE | 탑승 요금 (문자열로 저장) |
| **cabin** | VARCHAR | NULLABLE | 객실 번호 |
| **embarked** | VARCHAR | NULLABLE | 승선항 (`C`, `Q`, `S`) |

> **Note:** `survived`는 `bookings`가 아닌 `passengers` 테이블에 위치합니다. 생존 여부는 자본 정보가 아닌 승객 자신의 정보입니다.

---

## 2. DDL SQL (PostgreSQL)

```sql
-- 1. passengers 테이블 생성
CREATE TABLE passengers (
    passenger_id VARCHAR PRIMARY KEY,
    name VARCHAR,
    gender VARCHAR,
    age VARCHAR,
    sib_sp VARCHAR,
    parch VARCHAR,
    survived VARCHAR
);

-- 2. bookings 테이블 생성
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    passenger_id VARCHAR,
    pclass VARCHAR,
    ticket VARCHAR,
    fare VARCHAR,
    cabin VARCHAR,
    embarked VARCHAR,
    FOREIGN KEY (passenger_id) REFERENCES passengers(passenger_id)
);
```
