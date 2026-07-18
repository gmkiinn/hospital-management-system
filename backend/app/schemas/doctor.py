import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class DoctorCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    department_id: uuid.UUID
    specialization: str | None = None
    qualification: str | None = None
    consultation_fee: Decimal | None = None
    slot_duration_minutes: int = Field(default=15, ge=5, le=120)


class DoctorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    department_id: uuid.UUID
    full_name: str
    email: EmailStr
    specialization: str | None
    qualification: str | None
    consultation_fee: Decimal | None
    slot_duration_minutes: int
    is_active: bool
