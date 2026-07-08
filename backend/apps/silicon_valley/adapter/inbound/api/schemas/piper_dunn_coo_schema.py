from pydantic import BaseModel, Field

class DunnCooSchema(BaseModel):

    id: int = Field(0, description="Employee ID")
    name: str = Field("재러드 던", description="Employee's name")
    # 피드 파이퍼의 COO. 원래 Hooli에서 개빈의 비서로 일하던 특이한 이력의 소유자. 회사 운영을 열정적으로 떠받침.

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": 3,
                "name": "Jared Dunn",
            }
        }
    }
