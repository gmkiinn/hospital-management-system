import asyncio

from sqlalchemy import select

from app.core.database import AsyncSessionLocal, set_hospital_context
from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.hospital import Hospital
from app.models.user import User


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        existing = await session.execute(select(Hospital).limit(1))
        if existing.scalar_one_or_none() is not None:
            print("Already seeded - skipping.")
            return

        # 1. Pilot hospital (hospitals is NOT RLS-protected, so no context needed).
        hospital = Hospital(
            name="Demo General Hospital", city="Bengaluru", state="Karnataka"
        )
        session.add(hospital)
        await session.flush()  # assigns hospital.id within the transaction

        # 2. First admin - users IS RLS-protected, so set the tenant context first.
        await set_hospital_context(session, hospital.id)
        admin = User(
            hospital_id=hospital.id,
            email="admin@demo.com",
            password_hash=hash_password("admin12345"),
            role=UserRole.ADMIN,
            full_name="Demo Admin",
        )
        session.add(admin)
        await session.commit()
        print(f"Seeded hospital {hospital.id} and admin {admin.email}")


if __name__ == "__main__":
    asyncio.run(seed())
