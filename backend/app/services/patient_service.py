import uuid

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.patient import Patient
from app.schemas.patient import PatientCreate


async def create_patient(
    db: AsyncSession, hospital_id: uuid.UUID, data: PatientCreate
) -> Patient:
    patient = Patient(hospital_id=hospital_id, **data.model_dump())
    db.add(patient)
    await db.flush()
    return patient


async def search_by_phone(db: AsyncSession, query: str) -> list[Patient]:
    """Partial, case-insensitive lookup by phone or name.

    Previously an exact phone match, which returned nothing unless the full
    number was typed. A substring match is what the search box implies.
    """
    like = f"%{query.strip()}%"
    result = await db.execute(
        select(Patient)
        .where(
            or_(Patient.phone.ilike(like), Patient.full_name.ilike(like)),
            Patient.deleted_at.is_(None),
        )
        .order_by(Patient.full_name)
    )
    return list(result.scalars().all())


async def list_patients(db: AsyncSession) -> list[Patient]:
    result = await db.execute(
        select(Patient).where(Patient.deleted_at.is_(None)).order_by(Patient.full_name)
    )
    return list(result.scalars().all())


async def get_patient(db: AsyncSession, patient_id: uuid.UUID) -> Patient | None:
    result = await db.execute(
        select(Patient).where(Patient.id == patient_id, Patient.deleted_at.is_(None))
    )
    return result.scalar_one_or_none()
