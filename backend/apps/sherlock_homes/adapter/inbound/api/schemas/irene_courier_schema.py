from pydantic import BaseModel, EmailStr


class IreneCourierSchema(BaseModel):
    to: EmailStr
    subject: str
    prompt: str
