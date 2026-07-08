from pydantic import BaseModel, Field

'''
캐릭터: 레스트레이드 경감 (Lestrade)
역할 (keyword): adapter (외부 연동)
드라마 설정 및 시스템 기능: 런던 경시청(New Scotland Yard)의 경감.
공식 조직과 에이전트 시스템을 연결해 주는 브릿지 역할로, 외부 API 및 공공 데이터 소스 연동을 담당합니다.
'''

class LestradeAdapterSchema(BaseModel):

    id: int = Field(0, description="레스트레이드 ID")
    name: str = Field("레스트레이드 경감 (Lestrade)", description="런던 경시청(New Scotland Yard)의 경감")

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": 1,
                "name": "Lestrade adapter",
            }
        }
    }
