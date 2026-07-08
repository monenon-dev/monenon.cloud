from pydantic import BaseModel, Field

'''
캐릭터: 셜록 홈즈 (Sherlock)
역할 (keyword): judge (판단/추론)
드라마 설정 및 시스템 기능: 경찰이 해결하지 못하는 미궁의 사건을 해결하는 사설 자문 탐정.
모든 단서를 종합하여 최종 판단을 내리듯, 시스템의 핵심 추론 알고리즘을 수행하며 결론을 도출합니다.
'''

class HolmesJudgeSchema(BaseModel):

    id: int = Field(0, description="셜록 ID")
    name: str = Field("셜록 홈즈 (Sherlock)", description="사설 자문 탐정, 핵심 추론 및 판단 수행자")

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": 9,
                "name": "Holmes judge",
            }
        }
    }
