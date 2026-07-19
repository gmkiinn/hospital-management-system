import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import ProcessingStatus

MealTiming = Literal["before", "after"]


class Medication(BaseModel):
    """A single prescribed medicine with its dosing schedule.

    Deliberately lenient: the AI sometimes emits `meal: ""`, null booleans, or
    null strings. We coerce those to safe defaults instead of failing the whole
    prescription, so one odd field never loses the entire draft.
    """

    model_config = ConfigDict(extra="ignore")

    name: str = ""
    morning: bool = False
    afternoon: bool = False
    evening: bool = False
    night: bool = False
    meal: MealTiming = "after"
    duration: str = ""

    @field_validator("meal", mode="before")
    @classmethod
    def _normalize_meal(cls, v: object) -> str:
        # Anything that isn't clearly "before food" defaults to "after".
        return "before" if isinstance(v, str) and "before" in v.lower() else "after"

    @field_validator("morning", "afternoon", "evening", "night", mode="before")
    @classmethod
    def _coerce_bool(cls, v: object) -> bool:
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.strip().lower() in ("true", "1", "yes", "y")
        return bool(v) if v is not None else False

    @field_validator("name", "duration", mode="before")
    @classmethod
    def _coerce_str(cls, v: object) -> str:
        return "" if v is None else str(v)


class PrescriptionNote(BaseModel):
    """Doctor-facing note: a plain-language summary plus structured meds.

    Stored in the consultation's JSONB columns (ai_summary_draft / final_summary).
    Lenient so AI output validates cleanly and legacy notes don't error.
    """

    model_config = ConfigDict(extra="ignore")

    summary: str = ""
    medications: list[Medication] = Field(default_factory=list)

    @field_validator("summary", mode="before")
    @classmethod
    def _coerce_summary(cls, v: object) -> str:
        return "" if v is None else str(v)

    @field_validator("medications", mode="before")
    @classmethod
    def _only_dict_meds(cls, v: object) -> object:
        # Drop anything that isn't a medication object so the rest still parses.
        return [m for m in v if isinstance(m, dict)] if isinstance(v, list) else []


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
