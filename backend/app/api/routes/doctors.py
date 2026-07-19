import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.doctor import DoctorCreate, DoctorResponse, DoctorUpdate
from app.schemas.scheduling import DaySlots
from app.services import doctor_service, scheduling_service

router = APIRouter(prefix="/doctors", tags=["doctors"])


@router.post("", response_model=DoctorResponse, status_code=status.HTTP_201_CREATED)
async def create_doctor(
    payload: DoctorCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> DoctorResponse:
    try:
        doctor = await doctor_service.create_doctor(db, admin.hospital_id, payload)
        await db.commit()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        ) from exc
    return doctor_service.to_response(doctor)


@router.get("", response_model=list[DoctorResponse])
async def list_doctors(
    department_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[DoctorResponse]:
    doctors = await doctor_service.list_doctors(db, department_id)
    return [doctor_service.to_response(d) for d in doctors]


@router.get("/{doctor_id}", response_model=DoctorResponse)
async def get_doctor(
    doctor_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> DoctorResponse:
    doctor = await doctor_service.get_doctor(db, doctor_id)
    if doctor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found"
        )
    return doctor_service.to_response(doctor)


@router.patch("/{doctor_id}", response_model=DoctorResponse)
async def update_doctor(
    doctor_id: uuid.UUID,
    payload: DoctorUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> DoctorResponse:
    doctor = await doctor_service.get_doctor(db, doctor_id)
    if doctor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found"
        )
    doctor = await doctor_service.update_doctor(db, doctor, payload)
    await db.commit()
    return doctor_service.to_response(doctor)


@router.get("/{doctor_id}/slots", response_model=DaySlots)
async def get_doctor_slots(
    doctor_id: uuid.UUID,
    date: date,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> DaySlots:
    doctor = await doctor_service.get_doctor(db, doctor_id)
    if doctor is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found"
        )
    return await scheduling_service.get_day_slots(db, doctor, date)
