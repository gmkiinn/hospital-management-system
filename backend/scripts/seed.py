import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal, set_hospital_context
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.hospital import Hospital
from app.models.user import User

# Demo staff to ensure exist: (email, password, role, full name).
_STAFF = [
    ("admin@demo.com", "admin12345", UserRole.ADMIN, "Demo Admin"),
    ("reception@demo.com", "reception123", UserRole.RECEPTIONIST, "Demo Receptionist"),
]


async def seed() -> None:
    """Idempotent seed: ensure the demo hospital and demo staff exist.

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

        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
