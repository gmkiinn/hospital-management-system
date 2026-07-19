import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.enums import AppointmentSource, AppointmentStatus
from app.models.patient import Patient
from app.schemas.appointment import AppointmentCreate, WalkInBooking

ACTIVE_STATUSES = (
    AppointmentStatus.BOOKED,
    AppointmentStatus.ARRIVED,
    AppointmentStatus.IN_CONSULTATION,
)


async def _next_token(
    db: AsyncSession, doctor_id: uuid.UUID, slot_start: datetime
) -> int:
    """Next queue token for a doctor, reset each day.

    Assigned at booking time so the patient gets their token immediately (not
    only on arrival). Scoped to the slot's UTC calendar day so numbers restart
    daily instead of growing forever.
    """
    day_start = slot_start
    if day_start.tzinfo is None:
        day_start = day_start.replace(tzinfo=UTC)
    day_start = day_start.astimezone(UTC).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    day_end = day_start + timedelta(days=1)
    result = await db.execute(
        select(func.max(Appointment.token_number)).where(
            Appointment.doctor_id == doctor_id,
            Appointment.slot_start >= day_start,
            Appointment.slot_start < day_end,
        )
    )
    return (result.scalar() or 0) + 1


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
        token_number=await _next_token(db, data.doctor_id, data.slot_start),
        reason=data.reason,
    )
    db.add(appointment)
    await db.flush()  # UNIQUE(doctor_id, slot_start) fires here on a clash
    return appointment


async def book_walk_in(
    db: AsyncSession,
    hospital_id: uuid.UUID,
    booked_by_user_id: uuid.UUID,
    data: WalkInBooking,
) -> Appointment:
    """Capture the patient and book a slot in one step (receptionist board).

    The patient is matched by phone within the hospital (RLS-scoped) and reused
    if found, updating their details; otherwise a new patient is created.
    """
    result = await db.execute(
        select(Doctor).where(Doctor.id == data.doctor_id, Doctor.deleted_at.is_(None))
    )
    doctor = result.scalar_one_or_none()
    if doctor is None:
        raise ValueError("Doctor not found")

    existing = await db.execute(
        select(Patient).where(Patient.phone == data.phone, Patient.deleted_at.is_(None))
    )
    patient = existing.scalars().first()
    if patient is None:
        patient = Patient(
            hospital_id=hospital_id,
            full_name=data.full_name,
            phone=data.phone,
            gender=data.gender,
            email=data.email,
            address_line1=data.address,
        )
        db.add(patient)
    else:
        patient.full_name = data.full_name
        if data.gender is not None:
            patient.gender = data.gender
        if data.email is not None:
            patient.email = data.email
        if data.address is not None:
            patient.address_line1 = data.address
    await db.flush()

    slot_end = data.slot_start + timedelta(minutes=doctor.slot_duration_minutes)
    appointment = Appointment(
        hospital_id=hospital_id,
        doctor_id=data.doctor_id,
        patient_id=patient.id,
        booked_by_user_id=booked_by_user_id,
        slot_start=data.slot_start,
        slot_end=slot_end,
        source=AppointmentSource.WALK_IN,
        status=AppointmentStatus.BOOKED,
        token_number=await _next_token(db, data.doctor_id, data.slot_start),
        paid=data.paid,
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
    # Token is assigned at booking; only back-fill for legacy rows without one.
    if appointment.token_number is None:
        appointment.token_number = await _next_token(
            db, appointment.doctor_id, appointment.slot_start
        )
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
