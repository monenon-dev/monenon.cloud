from dataclasses import dataclass

@dataclass(frozen=True)
class HenricksCeoQuery:

    id: int
    name: str


@dataclass(frozen=True)
class HenricksCeoResponse:

    id: int
    name: str
