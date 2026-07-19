import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    UploadFile,
    status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.config import settings
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.consultation import (
    ConsentRequest,
    ConsultationResponse,
    FinalNoteRequest,
)
from app.services import appointment_service, consultation_service

router = APIRouter(tags=["consultations"])

_CLINICAL = (UserRole.DOCTOR, UserRole.ADMIN)
_ALLOWED_AUDIO = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
    "audio/mp4",
    "audio/m4a",
    "audio/x-m4a",
    "audio/ogg",
}


async def _load(db: AsyncSession, consultation_id: uuid.UUID):
    consultation = await consultation_service.get_consultation(db, consultation_id)
    if consultation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Consultation not found"
        )
    return consultation


@router.post(
    "/appointments/{appointment_id}/consultation",
    response_model=ConsultationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def start_consultation(
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _doctor: User = Depends(require_roles(*_CLINICAL)),
) -> ConsultationResponse:
    appointment = await appointment_service.get_appointment(db, appointment_id)
    if appointment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found"
        )
    consultation = await consultation_service.start_consultation(db, appointment)
    await db.commit()
    return ConsultationResponse.model_validate(consultation)


@router.get("/consultations/{consultation_id}", response_model=ConsultationResponse)
async def get_consultation(
    consultation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> ConsultationResponse:
    consultation = await _load(db, consultation_id)
    return ConsultationResponse.model_validate(consultation)


@router.post(
    "/consultations/{consultation_id}/consent", response_model=ConsultationResponse
)
async def set_consent(
    consultation_id: uuid.UUID,
    payload: ConsentRequest,
    db: AsyncSession = Depends(get_db),
    _doctor: User = Depends(require_roles(*_CLINICAL)),
) -> ConsultationResponse:
    consultation = await _load(db, consultation_id)
    await consultation_service.set_consent(db, consultation, payload.recording_consent)
    await db.commit()
    return ConsultationResponse.model_validate(consultation)


@router.post(
    "/consultations/{consultation_id}/audio", response_model=ConsultationResponse
)
async def upload_audio(
    consultation_id: uuid.UUID,
    background: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _doctor: User = Depends(require_roles(*_CLINICAL)),
) -> ConsultationResponse:
    consultation = await _load(db, consultation_id)
    if not consultation.recording_consent:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Recording consent is required before uploading audio",
        )
    # Strip any codec parameter (e.g. "audio/webm;codecs=opus" from MediaRecorder).
    base_content_type = (file.content_type or "").split(";")[0].strip().lower()
    if base_content_type not in _ALLOWED_AUDIO:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported audio type: {file.content_type}",
        )
    data = await file.read()
    if len(data) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Audio file too large",
        )

    upload_dir = Path(settings.upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "").suffix or ".webm"
    audio_path = upload_dir / f"{uuid.uuid4()}{suffix}"
    audio_path.write_bytes(data)

    await consultation_service.attach_audio(db, consultation, str(audio_path))
    await db.commit()

    background.add_task(
        consultation_service.process_consultation,
        consultation.id,
        consultation.hospital_id,
    )
    return ConsultationResponse.model_validate(consultation)


@router.patch(
    "/consultations/{consultation_id}/final-note",
    response_model=ConsultationResponse,
)
async def save_final_note(
    consultation_id: uuid.UUID,
    payload: FinalNoteRequest,
    db: AsyncSession = Depends(get_db),
    _doctor: User = Depends(require_roles(*_CLINICAL)),
) -> ConsultationResponse:
    consultation = await _load(db, consultation_id)
    await consultation_service.save_final_note(
        db, consultation, payload.final_summary.model_dump()
    )
    await db.commit()
    return ConsultationResponse.model_validate(consultation)
