from titanic.adapter.inbound.api.v1.passenger_isidor_couple_router import isidor_couple_router
from titanic.app.dependencies.passenger_isidor_couple_provider import (
    get_isidor_couple_repository,
    get_isidor_couple_use_case,
)
from titanic.fractal._node import CharacterNode

NODE = CharacterNode(
    slug="isidor",
    group="passenger",
    prefix="passenger_isidor_couple",
    display_name="이시도르·이다 스트라우스 (Isidor & Ida Straus)",
    router=isidor_couple_router,
    get_repository=get_isidor_couple_repository,
    get_use_case=get_isidor_couple_use_case,
)

__all__ = ["NODE"]
