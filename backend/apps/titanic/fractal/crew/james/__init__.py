from titanic.adapter.inbound.api.v1.crew_james_director_router import james_director_router
from titanic.app.dependencies.crew_james_director_provider import (
    get_james_director_repository,
    get_james_director_use_case,
)
from titanic.fractal._node import CharacterNode

NODE = CharacterNode(
    slug="james",
    group="crew",
    prefix="crew_james_director",
    display_name="제임스 카메론 (James Cameron)",
    router=james_director_router,
    get_repository=get_james_director_repository,
    get_use_case=get_james_director_use_case,
)

__all__ = ["NODE"]
