from pydantic import BaseModel


class JamesDirectorSchema(BaseModel):
    id: int
    name: str


class FileUploadSchema(BaseModel):
    passenger_id: str
    survived: str | None = None
    pclass: str | None = None
    name: str | None = None
    gender: str | None = None
    age: str | None = None
    sib_sp: str | None = None
    parch: str | None = None
    ticket: str | None = None
    fare: str | None = None
    cabin: str | None = None
    embarked: str | None = None


class TitanicRecordSchema(FileUploadSchema):
  """CSV 업로드 한 행 — FileUploadSchema 와 동일 필드."""


class UploadResultSchema(BaseModel):
    saved: int
