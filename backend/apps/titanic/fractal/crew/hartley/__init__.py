from titanic.adapter.inbound.api.v1.crew_hartley_violin_router import hartley_violin_router
from titanic.app.dependencies.crew_hartley_violin_provider import (
    get_hartley_violin_repository,
    get_hartley_violin_use_case,
)
from titanic.fractal._node import CharacterNode

NODE = CharacterNode(
    slug="hartley",
    group="crew",
    prefix="crew_hartley_violin",
    display_name="월리스 하틀리 (Wallace Hartley)",
    router=hartley_violin_router,
    get_repository=get_hartley_violin_repository,
    get_use_case=get_hartley_violin_use_case,
)

__all__ = ["NODE"]
