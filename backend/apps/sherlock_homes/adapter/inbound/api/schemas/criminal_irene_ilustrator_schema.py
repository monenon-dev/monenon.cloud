from pydantic import BaseModel, Field

'''
캐릭터: 아이린 애들러 (Irene)
역할 (keyword): ilustrator (시각화 및 변수 창출)
드라마 설정 및 시스템 기능: 국가 기밀을 손에 쥐고 셜록을 농락한 범죄자 (The Woman).
정형화되지 않은 방식으로 매력적인 변수(비정형 인사이트 보고서 컨셉, 독창적인 UI/UX 대안)를 도출합니다.
'''

class IreneIlustratorSchema(BaseModel):

    id: int = Field(0, description="아이린 ID")
    name: str = Field("아이린 애들러 (Irene)", description="국가 기밀을 손에 쥔 The Woman")

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": 7,
                "name": "Irene ilustrator",
            }
        }
    }
