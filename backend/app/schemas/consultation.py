import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ProcessingStatus


class ClinicalSummary(BaseModel):
    """Structured clinical-note shape. Lenient so AI output validates cleanly."""

    model_config = ConfigDict(extra="ignore")

    chief_complaint: str = ""
    history_of_present_illness: str = ""
    symptoms: list[str] = Field(default_factory=list)
    diagnosis: str = ""
    treatment_plan: str = ""
    follow_up: str = ""


class ConsentRequest(BaseModel):
    recording_consent: bool


class FinalNoteRequest(BaseModel):
    final_summary: ClinicalSummary


class ConsultationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    appointment_id: uuid.UUID
    recording_consent: bool
    consented_at: datetime | None
    audio_path: str | None
    processing_status: ProcessingStatus
    transcript: str | None
    ai_summary_draft: dict | None
    final_summary: dict | None
    reviewed_at: datetime | None
    error_message: str | None
