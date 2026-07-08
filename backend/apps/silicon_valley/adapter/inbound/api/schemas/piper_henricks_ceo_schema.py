from pydantic import BaseModel, Field

class HenricksCeoSchema(BaseModel):

    id: int = Field(0, description="Employee ID")
    name: str = Field("리차드 헨드릭스", description="Employee's name")
    # 피드 파이퍼의 CEO이자 창업자. 중간 아웃 압축 알고리즘 발명자. 뛰어난 기술력과 달리 사회성은 처참한 수준.

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": 5,
                "name": "Richard Hendricks",
            }
        }
    }
