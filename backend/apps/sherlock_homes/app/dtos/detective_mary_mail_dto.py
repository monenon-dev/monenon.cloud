from dataclasses import dataclass
from datetime import datetime

'''
캐릭터: 메리 왓슨 (Mary)
역할 (keyword): mail (메일/알림)
드라마 설정 및 시스템 기능: 사설 탐정단에 합류한 전직 비밀 요원.
베이커가 팀의 소식을 전하듯, 시스템 내부의 이메일 발송, 알림 전달 및 메시지 처리를 수행합니다.
'''

@dataclass(frozen=True)
class MaryMailQuery:
    id: int
    name: str


@dataclass(frozen=True)
class MaryMailResponse:
    id: int
    name: str


@dataclass(frozen=True)
class MaryMailReceiveQuery:
    subject: str
    from_: str
    to: str
    preview: str
    message_id: str


@dataclass(frozen=True)
class MaryMailReceiveResponse:
    message_id: str
    status: str


@dataclass(frozen=True)
class MailIngestQuery:
    from_email: str
    from_name: str | None
    subject: str
    body_text: str
    received_at: datetime | None
    message_id: str | None


@dataclass(frozen=True)
class MailIngestResult:
    ok: bool
    mail_id: int | None
    embedded: bool
    message: str
