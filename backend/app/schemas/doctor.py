import re
import uuid
from decimal import Decimal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

_HHMM = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


class DoctorSession(BaseModel):
    """One working session in the hospital's local time, e.g. Morning 10:00-14:00."""

    label: str = Field(min_length=1, max_length=50)
    start: str = Field(description="Local start time, 24h HH:MM")
    end: str = Field(description="Local end time, 24h HH:MM")

    @field_validator("start", "end")
    @classmethod
    def _valid_time(cls, v: str) -> str:
        if not _HHMM.match(v):
            raise ValueError("time must be in HH:MM 24-hour format")
        return v

    @model_validator(mode="after")
    def _end_after_start(self) -> "DoctorSession":
        if self.start >= self.end:
            raise ValueError("session end must be after start")
        return self


class DoctorCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)
    department_id: uuid.UUID
    specialization: str | None = None
    qualification: str | None = None
    consultation_fee: Decimal | None = None
    slot_duration_minutes: int = Field(default=15, ge=5, le=120)
    sessions: list[DoctorSession] = Field(default_factory=list)


class DoctorUpdate(BaseModel):
    """Editable fields for an existing doctor (used by the Setup screen)."""

    specialization: str | None = None
    qualification: str | None = None
    consultation_fee: Decimal | None = None
    slot_duration_minutes: int | None = Field(default=None, ge=5, le=120)
    sessions: list[DoctorSession] | None = None
    is_active: bool | None = None


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
    sessions: list[DoctorSession]
    is_active: bool
