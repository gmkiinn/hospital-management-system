import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.enums import AppointmentStatus
from app.schemas.appointment import AppointmentCreate

ACTIVE_STATUSES = (
    AppointmentStatus.BOOKED,
    AppointmentStatus.ARRIVED,
    AppointmentStatus.IN_CONSULTATION,
)


async def book_appointment(
    db: AsyncSession,
    hospital_id: uuid.UUID,
    booked_by_user_id: uuid.UUID,
    data: AppointmentCreate,
) -> Appointment:
    result = await db.execute(
        select(Doctor).where(Doctor.id == data.doctor_id, Doctor.deleted_at.is_(None))
    )
    doctor = result.scalar_one_or_none()
    if doctor is None:
        raise ValueError("Doctor not found")

    slot_end = data.slot_start + timedelta(minutes=doctor.slot_duration_minutes)
    appointment = Appointment(
        hospital_id=hospital_id,
        doctor_id=data.doctor_id,
        patient_id=data.patient_id,
        booked_by_user_id=booked_by_user_id,
        slot_start=data.slot_start,
        slot_end=slot_end,
        source=data.source,
        status=AppointmentStatus.BOOKED,
        reason=data.reason,
    )
    db.add(appointment)
    await db.flush()  # UNIQUE(doctor_id, slot_start) fires here on a clash
    return appointment


async def list_appointments(
    db: AsyncSession,
    doctor_id: uuid.UUID | None = None,
    status: AppointmentStatus | None = None,
) -> list[Appointment]:
    stmt = select(Appointment).where(Appointment.deleted_at.is_(None))
    if doctor_id is not None:
        stmt = stmt.where(Appointment.doctor_id == doctor_id)
    if status is not None:
        stmt = stmt.where(Appointment.status == status)
    result = await db.execute(stmt.order_by(Appointment.slot_start))
    return list(result.scalars().all())


async def doctor_queue(db: AsyncSession, doctor_id: uuid.UUID) -> list[Appointment]:
    result = await db.execute(
        select(Appointment)
        .where(
            Appointment.doctor_id == doctor_id,
            Appointment.status.in_(ACTIVE_STATUSES),
            Appointment.deleted_at.is_(None),
        )
        .order_by(Appointment.token_number.nullslast(), Appointment.slot_start)
    )
    return list(result.scalars().all())


async def get_appointment(
    db: AsyncSession, appointment_id: uuid.UUID
) -> Appointment | None:
    result = await db.execute(
        select(Appointment).where(
            Appointment.id == appointment_id, Appointment.deleted_at.is_(None)
        )
    )
    return result.scalar_one_or_none()


async def mark_arrived(db: AsyncSession, appointment: Appointment) -> Appointment:
    result = await db.execute(
        select(func.max(Appointment.token_number)).where(
            Appointment.doctor_id == appointment.doctor_id
        )
    )
    current_max = result.scalar() or 0
    appointment.token_number = current_max + 1
    appointment.status = AppointmentStatus.ARRIVED
    await db.flush()
    return appointment


async def set_status(
    db: AsyncSession,
    appointment: Appointment,
    new_status: AppointmentStatus,
    cancellation_reason: str | None = None,
) -> Appointment:
    appointment.status = new_status
    if new_status == AppointmentStatus.CANCELLED:
        appointment.cancelled_at = datetime.now(UTC)
        appointment.cancellation_reason = cancellation_reason
    await db.flush()
    return appointment
