import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.patient import PatientCreate, PatientResponse
from app.services import patient_service

router = APIRouter(prefix="/patients", tags=["patients"])


@router.post("", response_model=PatientResponse, status_code=status.HTTP_201_CREATED)
async def create_patient(
    payload: PatientCreate,
    db: AsyncSession = Depends(get_db),
    staff: User = Depends(require_roles(UserRole.ADMIN, UserRole.RECEPTIONIST)),
) -> PatientResponse:
    try:
        patient = await patient_service.create_patient(db, staff.hospital_id, payload)
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A patient with this phone number already exists",
        ) from exc
    return PatientResponse.model_validate(patient)


@router.get("", response_model=list[PatientResponse])
async def search_patients(
    phone: str | None = None,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[PatientResponse]:
    if phone:
        patients = await patient_service.search_by_phone(db, phone)
    else:
        patients = await patient_service.list_patients(db)
    return [PatientResponse.model_validate(p) for p in patients]


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    patient_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> PatientResponse:
    patient = await patient_service.get_patient(db, patient_id)
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found"
        )
    return PatientResponse.model_validate(patient)
