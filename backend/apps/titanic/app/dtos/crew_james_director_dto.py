from dataclasses import dataclass

@dataclass
class JamesDirectorQuery:
    id: str
    name: str

@dataclass
class JamesDirectorResponse:
    id: str
    name: str

@dataclass
class PassengerCommand:
    passenger_id: str
    name: str
    gender: str
    age: str
    sib_sp: str
    parch: str
    survived: str

@dataclass
class BookingCommand:
    pclass: str
    ticket: str
    fare: str
    cabin: str
    embarked: str

@dataclass(frozen=True)
class UploadRecordsResult:
    """수정 불가능한 순수 결과 배달부 DTO"""
    success: bool
    uploaded_count: int
    message: str