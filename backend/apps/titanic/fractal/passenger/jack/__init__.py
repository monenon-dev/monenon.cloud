from titanic.adapter.inbound.api.v1.passenger_jack_trainer_router import jack_trainer_router
from titanic.app.dependencies.passenger_jack_trainer_provider import (
    get_jack_trainer_repository,
    get_jack_trainer_use_case,
)
from titanic.fractal._node import CharacterNode

NODE = CharacterNode(
    slug="jack",
    group="passenger",
    prefix="passenger_jack_trainer",
    display_name="잭 도슨 (Jack Dawson)",
    router=jack_trainer_router,
    get_repository=get_jack_trainer_repository,
    get_use_case=get_jack_trainer_use_case,
)

__all__ = ["NODE"]
