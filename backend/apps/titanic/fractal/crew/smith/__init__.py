from titanic.adapter.inbound.api.v1.crew_smith_captain_router import smith_captain_router
from titanic.app.dependencies.crew_smith_captain_provider import (
    get_smith_captain_repository,
    get_smith_captain_use_case,
)
from titanic.fractal._node import CharacterNode

NODE = CharacterNode(
    slug="smith",
    group="crew",
    prefix="crew_smith_captain",
    display_name="에드워드 스미스 선장 (Captain Smith)",
    router=smith_captain_router,
    get_repository=get_smith_captain_repository,
    get_use_case=get_smith_captain_use_case,
)

__all__ = ["NODE"]
