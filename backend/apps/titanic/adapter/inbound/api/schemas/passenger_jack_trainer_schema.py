from pydantic import BaseModel


class JackTrainerSchema(BaseModel):
    id: int
    name: str
