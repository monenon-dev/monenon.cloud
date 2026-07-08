from pydantic import BaseModel, Field

class BighettiHrSchema(BaseModel):

    id: int = Field(0, description="Employee ID")
    name: str = Field("넬슨 비게티", description="Employee's name")
    # 리차드의 오랜 친구. 피드 파이퍼를 떠나 Hooli에 입사했다가 우연히 Hooli XYZ 사장이 됨. 인사 담당.

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": 1,
                "name": "Nelson Bighetti",
            }
        }
    }
