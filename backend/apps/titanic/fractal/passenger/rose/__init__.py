from titanic.adapter.inbound.api.v1.passenger_rose_model_router import rose_model_router
from titanic.app.dependencies.passenger_rose_model_provider import (
    get_rose_model_repository,
    get_rose_model_use_case,
)
from titanic.fractal._node import CharacterNode

NODE = CharacterNode(
    slug="rose",
    group="passenger",
    prefix="passenger_rose_model",
    display_name="로즈 드윗 (Rose DeWitt Bukater)",
    router=rose_model_router,
    get_repository=get_rose_model_repository,
    get_use_case=get_rose_model_use_case,
)

__all__ = ["NODE"]
