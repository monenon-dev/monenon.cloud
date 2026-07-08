from titanic.adapter.inbound.api.v1.crew_walter_roaster_router import walter_roaster_router
from titanic.app.dependencies.crew_walter_roaster_provider import (
    get_walter_roaster_repository,
    get_walter_roaster_use_case,
)
from titanic.fractal._node import CharacterNode

NODE = CharacterNode(
    slug="walter",
    group="crew",
    prefix="crew_walter_roaster",
    display_name="월터 니콜스 (Walter Nichols)",
    router=walter_roaster_router,
    get_repository=get_walter_roaster_repository,
    get_use_case=get_walter_roaster_use_case,
)

__all__ = ["NODE"]
