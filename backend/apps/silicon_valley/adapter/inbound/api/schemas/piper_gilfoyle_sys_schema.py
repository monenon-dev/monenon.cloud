from pydantic import BaseModel, Field

class GilfoyleSysSchema(BaseModel):

    id: int = Field(0, description="Employee ID")
    name: str = Field("버트람 길포일", description="Employee's name")
    # 피드 파이퍼의 시스템 아키텍트. 자칭 사타니스트. 딘에쉬와 만성 대립 관계이나 실력은 최정상급.

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": 4,
                "name": "Bertram Gilfoyle",
            }
        }
    }
