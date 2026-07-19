import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import AppointmentSource, AppointmentStatus, Gender


class AppointmentCreate(BaseModel):
    doctor_id: uuid.UUID
    patient_id: uuid.UUID
    slot_start: datetime
    source: AppointmentSource = AppointmentSource.WALK_IN
    reason: str | None = Field(default=None, max_length=2000)


class WalkInBooking(BaseModel):
    """Book a slot and capture the patient in one step (the receptionist board).

    The patient is matched by phone within the hospital and reused if present.
    """

    doctor_id: uuid.UUID
    slot_start: datetime
    full_name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=3, max_length=20)
    gender: Gender | None = None
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=500)
    paid: bool = False
    reason: str | None = Field(default=None, max_length=2000)


class AppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    doctor_id: uuid.UUID
    patient_id: uuid.UUID
    patient_name: str | None = None
    slot_start: datetime
    slot_end: datetime
    source: AppointmentSource
    status: AppointmentStatus
    token_number: int | None
    paid: bool
    reason: str | None


class CancelRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class VoiceBookingDraft(BaseModel):
    """A resolved-but-unconfirmed booking parsed from the receptionist's voice."""

    transcript: str
    doctor_id: uuid.UUID
    doctor_name: str
    date: date
    slot_start: datetime | None
    slot_label: str | None
    full_name: str | None
    phone: str | None
    gender: Gender | None
    email: str | None
    address: str | None
    paid: bool
    reason: str | None
    message: str | None
