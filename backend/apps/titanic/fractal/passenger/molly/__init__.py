from titanic.adapter.inbound.api.v1.passenger_molly_scaler_router import molly_scaler_router
from titanic.app.dependencies.passenger_molly_scaler_provider import (
    get_molly_scaler_repository,
    get_molly_scaler_use_case,
)
from titanic.fractal._node import CharacterNode

NODE = CharacterNode(
    slug="molly",
    group="passenger",
    prefix="passenger_molly_scaler",
    display_name="몰리 브라운 (Molly Brown)",
    router=molly_scaler_router,
    get_repository=get_molly_scaler_repository,
    get_use_case=get_molly_scaler_use_case,
)

__all__ = ["NODE"]
