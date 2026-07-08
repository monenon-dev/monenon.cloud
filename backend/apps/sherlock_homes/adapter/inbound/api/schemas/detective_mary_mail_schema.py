from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

'''
캐릭터: 메리 왓슨 (Mary)
역할 (keyword): mail (메일/알림)
드라마 설정 및 시스템 기능: 사설 탐정단에 합류한 전직 비밀 요원.
베이커가 팀의 소식을 전하듯, 시스템 내부의 이메일 발송, 알림 전달 및 메시지 처리를 수행합니다.
'''

class MaryMailSchema(BaseModel):

    id: int = Field(0, description="메리 ID")
    name: str = Field("메리 왓슨 (Mary)", description="전직 비밀 요원, 메일 및 알림 처리자")

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": 12,
                "name": "Mary mail",
            }
        }
    }


class MaryMailReceiveSchema(BaseModel):
    '''n8n HTTP Request 노드가 POST로 전송하는 Gmail 메일 수신 스키마'''

    subject: str = Field("", description="메일 제목")
    from_: str = Field("", alias="from", description="발신자 이메일")
    to: str = Field("", description="수신자 이메일")
    preview: str = Field("", description="본문 미리보기 (snippet)")
    message_id: str = Field("", alias="messageId", description="Gmail 메시지 ID")

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "subject": "안녕하세요, 문의드립니다",
                "from": "client@example.com",
                "to": "taylor@ragtailor.com",
                "preview": "안녕하세요. 이번 분기 실적 보고서 관련하여...",
                "messageId": "18abc123def456"
            }
        }
    }


class MailIngestSchema(BaseModel):
    """n8n → 왓슨/Mary 메일 수신 (pgvector 저장용)."""

    from_email: EmailStr = Field(..., description="발신자 이메일")
    from_name: str | None = Field(None, description="발신자 이름")
    subject: str = Field("(제목 없음)", description="메일 제목")
    body_text: str = Field("", description="본문 또는 snippet")
    received_at: datetime | None = Field(None, description="수신 시각 ISO 8601")
    message_id: str | None = Field(None, description="Gmail 메시지 ID")

    model_config = {
        "json_schema_extra": {
            "example": {
                "from_email": "client@example.com",
                "from_name": "홍길동",
                "subject": "문의드립니다",
                "body_text": "안녕하세요. 이번 분기 실적 관련하여...",
                "received_at": "2026-07-03T10:00:00+09:00",
                "message_id": "18abc123def456",
            }
        }
    }


class MailIngestResponse(BaseModel):
    ok: bool
    mail_id: int | None = None
    embedded: bool = False
    message: str
