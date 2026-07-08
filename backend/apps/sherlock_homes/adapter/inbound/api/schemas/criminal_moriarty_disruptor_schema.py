from pydantic import BaseModel, Field

'''
캐릭터: 모리어티 (Moriarty)
역할 (keyword): disruptor (시뮬레이터/레드팀)
드라마 설정 및 시스템 기능: 셜록의 숙적이자 자문 범죄자.
시스템의 취약점을 파고드는 카오스 엔지니어링이나 스트레스 테스트용 비정상 변수 데이터를 생성하여 방어력을 측정합니다.
'''

class MoriartyDisruptorSchema(BaseModel):

    id: int = Field(0, description="모리어티 ID")
    name: str = Field("모리어티 (Moriarty)", description="셜록의 숙적, 자문 범죄자")

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": 5,
                "name": "Moriarty disruptor",
            }
        }
    }
