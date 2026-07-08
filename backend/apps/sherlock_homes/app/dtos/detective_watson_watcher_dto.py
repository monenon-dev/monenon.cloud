from dataclasses import dataclass

'''
캐릭터: 존 왓슨 (John)
역할 (keyword): watcher (관찰/기록자)
드라마 설정 및 시스템 기능: 셜록의 파트너인 사설 탐정 조력자.
셜록의 모든 추론 과정을 블로그에 기록하듯, 시스템의 이벤트·로그·상태 변화를 관찰하고 기록합니다.
'''

@dataclass(frozen=True)
class WatsonWatcherQuery:
    id: int
    name: str


@dataclass(frozen=True)
class WatsonWatcherResponse:
    id: int
    name: str


@dataclass(frozen=True)
class WatsonMailTriageResult:
    ok: bool
    accepted: bool
    label: str
    score: float
    mail_id: int | None
    embedded: bool
    message: str
