from dataclasses import dataclass

'''
캐릭터: 허드슨 부인 (Mrs. Hudson)
역할 (keyword): scheduler (스케줄/일정 관리)
드라마 설정 및 시스템 기능: 사설 탐정들의 아지트인 베이커가 221B의 집주인.
베이커가의 일상을 꼼꼼히 관리하듯, 시스템의 작업 스케줄링, 배치 작업 및 태스크 큐 관리를 수행합니다.
'''

@dataclass(frozen=True)
class MrshudsonSchedulerQuery:
    id: int
    name: str


@dataclass(frozen=True)
class MrshudsonSchedulerResponse:
    id: int
    name: str
