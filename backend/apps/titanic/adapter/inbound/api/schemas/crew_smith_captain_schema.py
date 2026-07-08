from pydantic import BaseModel, Field


class SmithChatTurnSchema(BaseModel):
    role: str = Field(..., description="user | assistant")
    text: str = Field(..., min_length=1)


class SmithChatResponseSchema(BaseModel):
    reply: str = Field(..., description="스미스 선장 답변")
    rejected: bool = Field(False, description="타이타닉 외 주제로 거절됨")


class ChatSchema(BaseModel):
    messages: list[SmithChatTurnSchema] = Field(
        ...,
        min_length=1,
        description="대화 기록 (마지막 user 턴이 이번 질문)",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "messages": [
                    {"role": "assistant", "text": "안녕하십니까. RMS 타이타닉의 스미스 선장입니다."},
                    {"role": "user", "text": "타이타닉 생존율을 분석해줘"},
                ],
            }
        }
    }

    def latest_user_message(self) -> str:
        for turn in reversed(self.messages):
            if turn.role == "user":
                return turn.text
        raise ValueError("messages에 user 역할이 없습니다.")

    def history_before_latest_user(self) -> list[SmithChatTurnSchema]:
        for index in range(len(self.messages) - 1, -1, -1):
            if self.messages[index].role == "user":
                return self.messages[:index]
        return []


class SmithCaptainSchema(BaseModel):
    
    id: int = Field(0, description="Captain ID")
    name: str = Field("에드워드 스미스", description="Captain's name")
    # 타이타닉 선장. 백만장자들의 선장이라 불렸으며 고조되는 위기 속에 배와 운명을 함께함
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": 5,
                "name": "Edward Smith",
            }
        }
    }