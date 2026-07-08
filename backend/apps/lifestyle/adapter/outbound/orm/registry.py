from lifestyle.adapter.outbound.orm.chat_orm import ChatSession, Message
from lifestyle.adapter.outbound.orm.lifestyle_orm import (
    Closet,
    ClosetItem,
    Music,
    MusicItem,
    Refrigerator,
    RefrigeratorItem,
    UserSetting,
)

LIFESTYLE_TABLE_META: list[tuple[str, str, str, str, str]] = [
    ("user_settings", "취향 설정", "user_settings", "운영", "관리자 — 회원별 취향 설정 조회"),
    ("closet", "옷장 선호", "closet", "선호도", "평소 스타일·체감온도 (추천 컨텍스트)"),
    ("closet_items", "옷장 아이템", "closet_items", "라이프스타일", "보유 의류·날씨 맞춤 추천"),
    ("refrigerator", "냉장고 선호", "refrigerator", "선호도", "기피·알레르기·요리 성향"),
    ("refrigerator_items", "냉장고 식재료", "refrigerator_items", "라이프스타일", "재고·유통기한·채팅 추천"),
    ("music", "음악 선호", "music", "선호도", "장르·무드 (추천 컨텍스트)"),
    ("music_items", "음악 저장곡", "music_items", "라이프스타일", "저장곡·날씨·상황 추천"),
]

CHAT_TABLE_META: list[tuple[str, str, str, str, str]] = [
    ("chat_sessions", "Chat_Sessions", "chat_sessions", "채팅", "채팅방·세션"),
    ("messages", "Messages", "messages", "채팅", "대화 메시지"),
]

LIFESTYLE_MODEL_MAP = {
    "user_settings": UserSetting,
    "closet": Closet,
    "closet_items": ClosetItem,
    "refrigerator": Refrigerator,
    "refrigerator_items": RefrigeratorItem,
    "music": Music,
    "music_items": MusicItem,
}

CHAT_MODEL_MAP = {
    "chat_sessions": ChatSession,
    "messages": Message,
}
