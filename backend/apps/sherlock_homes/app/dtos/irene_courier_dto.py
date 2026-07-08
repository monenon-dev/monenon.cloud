from dataclasses import dataclass

'''
캐릭터: 아이린 애들러 (Irene Adler)
역할 (keyword): courier (전령)
드라마 설정 및 시스템 기능: 셜록이 유일하게 "그 여자"라 부르는 인물.
치밀한 언어와 문장으로 상대를 압도하며, LLM이 작성한 이메일을 지정된 수신자에게 발송합니다.
'''


@dataclass(frozen=True)
class IreneCourierCommand:
    to: str
    subject: str
    prompt: str


@dataclass(frozen=True)
class IreneCourierResponse:
    success: bool
    to: str
    message: str
