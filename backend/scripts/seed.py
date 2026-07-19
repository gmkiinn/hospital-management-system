import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal, set_hospital_context
from app.core.security import hash_password
from app.models.department import Department
from app.models.doctor import Doctor
from app.models.enums import UserRole
from app.models.hospital import Hospital
from app.models.user import User

# Demo staff to ensure exist: (email, password, role, full name).
_STAFF = [
    ("admin@demo.com", "admin12345", UserRole.ADMIN, "Demo Admin"),
    ("reception@demo.com", "reception123", UserRole.RECEPTIONIST, "Demo Receptionist"),
]

# Demo doctor advertised on the login screen. Created with working sessions so
# the appointment board has bookable slots out of the box.
_DOCTOR_EMAIL = "dr.rahul@demo.com"
_DOCTOR_PASSWORD = "doctor12345"
_DOCTOR_NAME = "Dr. Rahul Sharma"
_DOCTOR_DEPT = "General Medicine"
_DOCTOR_SESSIONS = [
    {"label": "Morning", "start": "09:00", "end": "12:00"},
    {"label": "Evening", "start": "17:00", "end": "20:00"},
]


async def _ensure_demo_doctor(session, hospital_id) -> None:
    """Create the login-screen demo doctor (+ department) if missing."""
    existing = (
        await session.execute(select(User).where(User.email == _DOCTOR_EMAIL))
    ).scalar_one_or_none()
    if existing is not None:
        print(f"{_DOCTOR_EMAIL} exists - skipping")
        return

    department = (
        await session.execute(select(Department).where(Department.name == _DOCTOR_DEPT))
    ).scalar_one_or_none()
    if department is None:
        department = Department(hospital_id=hospital_id, name=_DOCTOR_DEPT)
        session.add(department)
        await session.flush()
        print(f"Created department {_DOCTOR_DEPT}")

    user = User(
        hospital_id=hospital_id,
        email=_DOCTOR_EMAIL,
        password_hash=hash_password(_DOCTOR_PASSWORD),
        role=UserRole.DOCTOR,
        full_name=_DOCTOR_NAME,
    )
    session.add(user)
    await session.flush()
    session.add(
        Doctor(
            hospital_id=hospital_id,
            user_id=user.id,
            department_id=department.id,
            specialization="General Physician",
            slot_duration_minutes=15,
            sessions=_DOCTOR_SESSIONS,
        )
    )
    print(f"Created doctor {_DOCTOR_EMAIL}")


async def seed() -> None:
    """Idempotent seed: ensure the demo hospital, staff, and doctor exist.

    Safe to run on every deploy — it creates only what's missing, so it also
    back-fills new demo accounts onto an already-seeded database.
    """
    async with AsyncSessionLocal() as session:
        # Pilot hospital (hospitals is NOT RLS-protected, so no context needed).
        hospital = (
            await session.execute(select(Hospital).limit(1))
        ).scalar_one_or_none()
        if hospital is None:
            hospital = Hospital(
                name="Demo General Hospital", city="Bengaluru", state="Karnataka"
            )
            session.add(hospital)
            await session.flush()  # assigns hospital.id within the transaction
            print(f"Created hospital {hospital.id}")
        else:
            print(f"Hospital {hospital.id} exists")

        # users IS RLS-protected, so set the tenant context before querying/inserting.
        await set_hospital_context(session, hospital.id)
        for email, password, role, full_name in _STAFF:
            existing = (
                await session.execute(select(User).where(User.email == email))
            ).scalar_one_or_none()
            if existing is None:
                session.add(
                    User(
                        hospital_id=hospital.id,
                        email=email,
                        password_hash=hash_password(password),
                        role=role,
                        full_name=full_name,
                    )
                )
                print(f"Created {role.value} {email}")
            else:
                print(f"{email} exists - skipping")

        await _ensure_demo_doctor(session, hospital.id)

        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
