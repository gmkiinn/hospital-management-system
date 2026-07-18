import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import AsyncSessionLocal, set_hospital_context
from app.models.appointment import Appointment
from app.models.consultation import Consultation
from app.models.enums import AppointmentStatus, ProcessingStatus
from app.services import ai_service


async def start_consultation(
    db: AsyncSession, appointment: Appointment
) -> Consultation:
    result = await db.execute(
        select(Consultation).where(Consultation.appointment_id == appointment.id)
    )
    consultation = result.scalar_one_or_none()
    if consultation is None:
        consultation = Consultation(
            hospital_id=appointment.hospital_id, appointment_id=appointment.id
        )
        db.add(consultation)
    appointment.status = AppointmentStatus.IN_CONSULTATION
    await db.flush()
    return consultation


async def get_consultation(
    db: AsyncSession, consultation_id: uuid.UUID
) -> Consultation | None:
    result = await db.execute(
        select(Consultation).where(Consultation.id == consultation_id)
    )
    return result.scalar_one_or_none()


async def set_consent(
    db: AsyncSession, consultation: Consultation, consent: bool
) -> Consultation:
    consultation.recording_consent = consent
    consultation.consented_at = datetime.now(UTC) if consent else None
    await db.flush()
    return consultation


async def attach_audio(
    db: AsyncSession, consultation: Consultation, audio_path: str
) -> Consultation:
    consultation.audio_path = audio_path
    consultation.processing_status = ProcessingStatus.PENDING
    consultation.error_message = None
    await db.flush()
    return consultation


async def save_final_note(
    db: AsyncSession, consultation: Consultation, final_summary: dict
) -> Consultation:
    consultation.final_summary = final_summary
    consultation.reviewed_at = datetime.now(UTC)
    appt = await db.execute(
        select(Appointment).where(Appointment.id == consultation.appointment_id)
    )
    appointment = appt.scalar_one_or_none()
    if appointment is not None:
        appointment.status = AppointmentStatus.COMPLETED
    await db.flush()
    return consultation


async def process_consultation(
    consultation_id: uuid.UUID, hospital_id: uuid.UUID
) -> None:
    """Background task: transcribe, then summarize, updating status as it goes.

    Runs in its own session (the request's session is already closed). RLS context
    is re-set after each commit because set_config(local=true) resets per transaction.
    """
    async with AsyncSessionLocal() as db:
        await set_hospital_context(db, hospital_id)
        result = await db.execute(
            select(Consultation).where(Consultation.id == consultation_id)
        )
        consultation = result.scalar_one_or_none()
        if consultation is None or not consultation.audio_path:
            return
        audio_path = consultation.audio_path
        consultation.processing_status = ProcessingStatus.TRANSCRIBING
        await db.commit()

        try:
            transcript = await ai_service.transcribe_audio(audio_path)
            await set_hospital_context(db, hospital_id)
            consultation.transcript = transcript
            consultation.processing_status = ProcessingStatus.SUMMARIZING
            await db.commit()

            draft = await ai_service.summarize_transcript(transcript)
            await set_hospital_context(db, hospital_id)
            consultation.ai_summary_draft = draft
            consultation.processing_status = ProcessingStatus.READY
            await db.commit()
        except Exception as exc:  # noqa: BLE001 - record any failure for the doctor
            await db.rollback()
            await set_hospital_context(db, hospital_id)
            consultation.processing_status = ProcessingStatus.FAILED
            consultation.error_message = str(exc)[:500]
            await db.commit()
