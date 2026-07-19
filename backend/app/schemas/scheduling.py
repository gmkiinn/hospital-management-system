import uuid
from datetime import date, datetime

from pydantic import BaseModel

# "available" plus every AppointmentStatus value the slot may carry.
SlotStatus = str


class Slot(BaseModel):
    slot_start: datetime  # timezone-aware UTC; sent back verbatim when booking
    slot_end: datetime
    label: str  # local clock time for display, e.g. "10:15"
    status: (
        SlotStatus  # "available" | booked | arrived | in_consultation | completed | ...
    )
    appointment_id: uuid.UUID | None = None
    patient_name: str | None = None
    paid: bool | None = None
    token_number: int | None = None


class SlotSession(BaseModel):
    label: str
    start: str
    end: str
    slots: list[Slot]


class DaySlots(BaseModel):
    doctor_id: uuid.UUID
    date: date
    timezone: str
    slot_duration_minutes: int
    sessions: list[SlotSession]
