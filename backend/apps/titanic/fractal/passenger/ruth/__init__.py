from titanic.adapter.inbound.api.v1.passenger_ruth_validation_router import ruth_validation_router
from titanic.app.dependencies.passenger_ruth_validation_provider import (
    get_ruth_validation_repository,
    get_ruth_validation_use_case,
)
from titanic.fractal._node import CharacterNode

NODE = CharacterNode(
    slug="ruth",
    group="passenger",
    prefix="passenger_ruth_validation",
    display_name="루스 드윗 (Ruth DeWitt Bukater)",
    router=ruth_validation_router,
    get_repository=get_ruth_validation_repository,
    get_use_case=get_ruth_validation_use_case,
)

__all__ = ["NODE"]
