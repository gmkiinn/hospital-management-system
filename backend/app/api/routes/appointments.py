import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.enums import AppointmentStatus, UserRole
from app.models.user import User
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
    CancelRequest,
    WalkInBooking,
)
from app.services import appointment_service

router = APIRouter(prefix="/appointments", tags=["appointments"])

# Doctors have full appointment privileges too (book, check in, cancel).
_STAFF = (UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR)


@router.post(
    "", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED
)
async def book_appointment(
    payload: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
    staff: User = Depends(require_roles(*_STAFF)),
) -> AppointmentResponse:
    try:
        appointment = await appointment_service.book_appointment(
            db, staff.hospital_id, staff.id, payload
        )
        await db.commit()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That doctor already has an appointment at this time",
        ) from exc
    return AppointmentResponse.model_validate(appointment)


@router.post(
    "/walk-in", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED
)
async def book_walk_in(
    payload: WalkInBooking,
    db: AsyncSession = Depends(get_db),
    staff: User = Depends(require_roles(*_STAFF)),
) -> AppointmentResponse:
    try:
        appointment = await appointment_service.book_walk_in(
            db, staff.hospital_id, staff.id, payload
        )
        await db.commit()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That slot was just taken",
        ) from exc
    return AppointmentResponse.model_validate(appointment)


@router.get("", response_model=list[AppointmentResponse])
async def list_appointments(
    doctor_id: uuid.UUID | None = None,
    status_filter: AppointmentStatus | None = None,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[AppointmentResponse]:
    appointments = await appointment_service.list_appointments(
        db, doctor_id, status_filter
    )
    return [AppointmentResponse.model_validate(a) for a in appointments]


@router.get("/queue", response_model=list[AppointmentResponse])
async def get_queue(
    doctor_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[AppointmentResponse]:
    appointments = await appointment_service.doctor_queue(db, doctor_id)
    return [AppointmentResponse.model_validate(a) for a in appointments]


async def _load(db: AsyncSession, appointment_id: uuid.UUID):
    appointment = await appointment_service.get_appointment(db, appointment_id)
    if appointment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found"
        )
    return appointment


@router.post("/{appointment_id}/arrive", response_model=AppointmentResponse)
async def mark_arrived(
    appointment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _staff: User = Depends(require_roles(*_STAFF)),
) -> AppointmentResponse:
    appointment = await _load(db, appointment_id)
    appointment = await appointment_service.mark_arrived(db, appointment)
    await db.commit()
    return AppointmentResponse.model_validate(appointment)


@router.post("/{appointment_id}/cancel", response_model=AppointmentResponse)
async def cancel_appointment(
    appointment_id: uuid.UUID,
    payload: CancelRequest,
    db: AsyncSession = Depends(get_db),
    _staff: User = Depends(require_roles(*_STAFF)),
) -> AppointmentResponse:
    appointment = await _load(db, appointment_id)
    appointment = await appointment_service.set_status(
        db, appointment, AppointmentStatus.CANCELLED, payload.reason
    )
    await db.commit()
    return AppointmentResponse.model_validate(appointment)
