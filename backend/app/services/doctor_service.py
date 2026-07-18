import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.department import Department
from app.models.doctor import Doctor
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.doctor import DoctorCreate, DoctorResponse


def to_response(doctor: Doctor) -> DoctorResponse:
    return DoctorResponse(
        id=doctor.id,
        user_id=doctor.user_id,
        department_id=doctor.department_id,
        full_name=doctor.user.full_name,
        email=doctor.user.email,
        specialization=doctor.specialization,
        qualification=doctor.qualification,
        consultation_fee=doctor.consultation_fee,
        slot_duration_minutes=doctor.slot_duration_minutes,
        is_active=doctor.is_active,
    )


async def create_doctor(
    db: AsyncSession, hospital_id: uuid.UUID, data: DoctorCreate
) -> Doctor:
    dept = await db.execute(
        select(Department).where(
            Department.id == data.department_id, Department.deleted_at.is_(None)
        )
    )
    if dept.scalar_one_or_none() is None:
        raise ValueError("Department not found")

    user = User(
        hospital_id=hospital_id,
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole.DOCTOR,
    )
    db.add(user)
    await db.flush()

    doctor = Doctor(
        hospital_id=hospital_id,
        user_id=user.id,
        department_id=data.department_id,
        specialization=data.specialization,
        qualification=data.qualification,
        consultation_fee=data.consultation_fee,
        slot_duration_minutes=data.slot_duration_minutes,
    )
    db.add(doctor)
    await db.flush()
    await db.refresh(doctor, ["user"])
    return doctor


async def list_doctors(
    db: AsyncSession, department_id: uuid.UUID | None = None
) -> list[Doctor]:
    stmt = select(Doctor).where(Doctor.deleted_at.is_(None))
    if department_id is not None:
        stmt = stmt.where(Doctor.department_id == department_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_doctor(db: AsyncSession, doctor_id: uuid.UUID) -> Doctor | None:
    result = await db.execute(
        select(Doctor).where(Doctor.id == doctor_id, Doctor.deleted_at.is_(None))
    )
    return result.scalar_one_or_none()
