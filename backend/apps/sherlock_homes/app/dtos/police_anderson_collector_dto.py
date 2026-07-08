from dataclasses import dataclass

'''
캐릭터: 앤더슨 (Anderson)
역할 (keyword): collector (로그/수집가)
드라마 설정 및 시스템 기능: 런던 경시청의 감식반원(이후 셜록의 팬클럽 결성).
현장의 원시 데이터를 수집하고 시스템의 초기 로그 및 로우(Raw) 데이터를 정제합니다.
'''

@dataclass(frozen=True)
class AndersonCollectorQuery:
    id: int
    name: str


@dataclass(frozen=True)
class AndersonCollectorResponse:
    id: int
    name: str
