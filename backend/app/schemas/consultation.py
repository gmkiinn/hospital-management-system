import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ProcessingStatus

MealTiming = Literal["before", "after"]


class Medication(BaseModel):
    """A single prescribed medicine with its dosing schedule."""

    model_config = ConfigDict(extra="ignore")

    name: str = ""
    morning: bool = False
    afternoon: bool = False
    evening: bool = False
    night: bool = False
    meal: MealTiming = "after"
    duration: str = ""


class PrescriptionNote(BaseModel):
    """Doctor-facing note: a plain-language summary plus structured meds.

    Stored in the consultation's JSONB columns (ai_summary_draft / final_summary).
    Lenient so AI output validates cleanly and legacy notes don't error.
    """

    model_config = ConfigDict(extra="ignore")

    summary: str = ""
    medications: list[Medication] = Field(default_factory=list)


class ConsentRequest(BaseModel):
    recording_consent: bool


class FinalNoteRequest(BaseModel):
    final_summary: PrescriptionNote


class ConsultationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    appointment_id: uuid.UUID
    recording_consent: bool
    consented_at: datetime | None
    audio_path: str | None
    processing_status: ProcessingStatus
    transcript: str | None
    ai_summary_draft: PrescriptionNote | None
    final_summary: PrescriptionNote | None
    reviewed_at: datetime | None
    error_message: str | None
