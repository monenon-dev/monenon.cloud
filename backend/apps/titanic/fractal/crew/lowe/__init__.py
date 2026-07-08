from titanic.adapter.inbound.api.v1.crew_lowe_boat_router import lowe_boat_router
from titanic.app.dependencies.crew_lowe_boat_provider import (
    get_lowe_boat_repository,
    get_lowe_boat_use_case,
)
from titanic.fractal._node import CharacterNode

NODE = CharacterNode(
    slug="lowe",
    group="crew",
    prefix="crew_lowe_boat",
    display_name="해롤드 로우 (Harold Lowe)",
    router=lowe_boat_router,
    get_repository=get_lowe_boat_repository,
    get_use_case=get_lowe_boat_use_case,
)

__all__ = ["NODE"]
