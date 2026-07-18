import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import AppointmentSource, AppointmentStatus


class AppointmentCreate(BaseModel):
    doctor_id: uuid.UUID
    patient_id: uuid.UUID
    slot_start: datetime
    source: AppointmentSource = AppointmentSource.WALK_IN
    reason: str | None = Field(default=None, max_length=2000)


class AppointmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    doctor_id: uuid.UUID
    patient_id: uuid.UUID
    slot_start: datetime
    slot_end: datetime
    source: AppointmentSource
    status: AppointmentStatus
    token_number: int | None
    reason: str | None


class CancelRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)
