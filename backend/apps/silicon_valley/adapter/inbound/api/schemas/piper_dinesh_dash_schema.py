from pydantic import BaseModel, Field

class DineshDashSchema(BaseModel):

    id: int = Field(0, description="Employee ID")
    name: str = Field("딘에쉬 추그타이", description="Employee's name")
    # 피드 파이퍼의 백엔드 개발자. 길포일과 끊임없이 티격태격하며 대시보드 개발을 담당함.

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": 2,
                "name": "Dinesh Chugtai",
            }
        }
    }
