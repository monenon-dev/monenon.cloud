from sherlock_homes.adapter.outbound.n8n.irene_courier_n8n_email_sender import IreneCourierN8nEmailSender
from sherlock_homes.app.ports.input.irene_courier_use_case import IreneCourierUseCase
from sherlock_homes.app.use_cases.irene_courier_interactor import IreneCourierInteractor
from lol.ollama.faker_orchestrator import faker_orchestrator

'''
캐릭터: 아이린 애들러 (Irene Adler)
역할 (keyword): courier (전령)
드라마 설정 및 시스템 기능: 셜록이 유일하게 "그 여자"라 부르는 인물.
치밀한 언어와 문장으로 상대를 압도하며, LLM이 작성한 이메일을 지정된 수신자에게 발송합니다.
'''


def get_irene_courier_use_case() -> IreneCourierUseCase:
    email_sender = IreneCourierN8nEmailSender()
    return IreneCourierInteractor(email_sender=email_sender, orchestrator=faker_orchestrator)
