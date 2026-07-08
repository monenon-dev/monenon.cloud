from titanic.adapter.inbound.api.v1.passenger_cal_tester_router import cal_tester_router
from titanic.app.dependencies.passenger_cal_tester_provider import (
    get_cal_tester_repository,
    get_cal_tester_use_case,
)
from titanic.fractal._node import CharacterNode

NODE = CharacterNode(
    slug="cal",
    group="passenger",
    prefix="passenger_cal_tester",
    display_name="캘던 호케이 (Caledon Hockley)",
    router=cal_tester_router,
    get_repository=get_cal_tester_repository,
    get_use_case=get_cal_tester_use_case,
)

__all__ = ["NODE"]
