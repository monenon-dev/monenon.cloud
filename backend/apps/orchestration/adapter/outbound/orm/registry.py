from orchestration.adapter.outbound.orm.chat_orm import ChatSession, Message
from orchestration.adapter.outbound.orm.daily_briefing_orm import DailyBriefing
from orchestration.adapter.outbound.orm.orchestration_orm import UserSetting

ORCHESTRATION_TABLE_META: list[tuple[str, str, str, str, str]] = [
    ("user_settings", "취향 설정", "user_settings", "운영", "관리자 — 회원별 취향 설정 조회"),
    ("daily_briefings", "일일 브리핑", "daily_briefings", "에이전트", "능동적 브리핑 사전 생성"),
]

CHAT_TABLE_META: list[tuple[str, str, str, str, str]] = [
    ("chat_sessions", "Chat_Sessions", "chat_sessions", "채팅", "채팅방·세션"),
    ("messages", "Messages", "messages", "채팅", "대화 메시지"),
]

ORCHESTRATION_MODEL_MAP = {
    "user_settings": UserSetting,
    "daily_briefings": DailyBriefing,
}

CHAT_MODEL_MAP = {
    "chat_sessions": ChatSession,
    "messages": Message,
}
