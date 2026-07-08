from pydantic import BaseModel, Field

'''
캐릭터: 유라루스 홈즈 (Eurus)
역할 (keyword): prophet (예측/예언가)
드라마 설정 및 시스템 기능: 섬에 격리된 최강 지능의 범죄자.
인간의 행동을 완벽히 읽고 프로그래밍하듯 미래를 통제하며, 타겟 모델의 트렌드 예측 및 비선형적 시나리오를 모델링합니다.
'''

class EurusProphetSchema(BaseModel):

    id: int = Field(0, description="유라루스 ID")
    name: str = Field("유라루스 홈즈 (Eurus)", description="섬에 격리된 최강 지능의 범죄자")

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": 6,
                "name": "Eurus prophet",
            }
        }
    }
