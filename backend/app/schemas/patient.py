import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import Gender


class PatientCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=3, max_length=20)
    date_of_birth: date | None = None
    gender: Gender | None = None
    blood_group: str | None = Field(default=None, max_length=5)
    email: EmailStr | None = None
    address_line1: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    allergies: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None


class PatientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    phone: str
    date_of_birth: date | None
    gender: Gender | None
    blood_group: str | None
    email: str | None
    address_line1: str | None
    allergies: str | None
    emergency_contact_name: str | None
    emergency_contact_phone: str | None
