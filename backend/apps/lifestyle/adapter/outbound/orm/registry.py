from lifestyle.adapter.outbound.orm.chat_orm import ChatSession, Message
from lifestyle.adapter.outbound.orm.lifestyle_orm import UserSetting

LIFESTYLE_TABLE_META: list[tuple[str, str, str, str, str]] = [
    ("user_settings", "취향 설정", "user_settings", "운영", "관리자 — 회원별 취향 설정 조회"),
]

CHAT_TABLE_META: list[tuple[str, str, str, str, str]] = [
    ("chat_sessions", "Chat_Sessions", "chat_sessions", "채팅", "채팅방·세션"),
    ("messages", "Messages", "messages", "채팅", "대화 메시지"),
]

LIFESTYLE_MODEL_MAP = {
    "user_settings": UserSetting,
}

CHAT_MODEL_MAP = {
    "chat_sessions": ChatSession,
    "messages": Message,
}
