from titanic.adapter.inbound.api.v1.crew_andrews_architect_router import andrews_architect_router
from titanic.app.dependencies.crew_andrews_architect_provider import (
    get_andrews_architect_repository,
    get_andrews_architect_use_case,
)
from titanic.fractal._node import CharacterNode

NODE = CharacterNode(
    slug="andrews",
    group="crew",
    prefix="crew_andrews_architect",
    display_name="토마스 앤드류스 (Thomas Andrews)",
    router=andrews_architect_router,
    get_repository=get_andrews_architect_repository,
    get_use_case=get_andrews_architect_use_case,
)

__all__ = ["NODE"]
