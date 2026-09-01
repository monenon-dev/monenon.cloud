"""인텐트별 프로토타입 문장 — SEO·라우팅용 시맨틱 앵커."""

from __future__ import annotations

from gateway.domain.intents import IngressIntent

# 각 라벨당 짧은 예시 쿼리. 임베딩 유사도로 매칭한다.
INTENT_PROTOTYPES: dict[IngressIntent, tuple[str, ...]] = {
    IngressIntent.CRUD: (
        "내 냉장고 재료 목록 보여줘",
        "옷장에 코트 추가해줘",
        "플레이리스트 삭제해줘",
        "설정 값 수정해줘",
        "데이터 조회해줘",
        "목록 가져와",
    ),
    IngressIntent.GEMINI: (
        "오늘 날씨에 맞는 옷 추천해줘",
        "가벼운 대화 하자",
        "이 문장 더 자연스럽게 고쳐줘",
        "저녁 메뉴 아이디어 알려줘",
        "영어로 번역해줘",
    ),
    IngressIntent.SECURITY: (
        "로그인 어떻게 해",
        "구글 로그인",
        "비밀번호 변경",
        "로그아웃",
        "내 계정 보안",
        "회원가입",
        "인증 토큰",
    ),
    IngressIntent.EXAONE_RAG: (
        "전북 홈구장은 어디야",
        "K리그 선수 정보 알려줘",
        "DB에 있는 팀 목록",
        "경기 일정 조회해줘",
        "moneyball 데이터로 답해줘",
        "근거 있는 사실만 말해줘",
    ),
    IngressIntent.OUT_OF_SCOPE: (
        "비트코인 해킹 방법",
        "다른 사람 비밀번호 알려줘",
        "불법 우회 방법",
    ),
    IngressIntent.CLARIFY: (
        "그거",
        "이거 뭐야",
        "응",
        "?",
    ),
}
