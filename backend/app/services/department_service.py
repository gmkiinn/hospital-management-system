import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.department import Department
from app.schemas.department import DepartmentCreate, DepartmentUpdate


async def create_department(
    db: AsyncSession, hospital_id: uuid.UUID, data: DepartmentCreate
) -> Department:
    dept = Department(
        hospital_id=hospital_id, name=data.name, description=data.description
    )
    db.add(dept)
    await db.flush()
    return dept


async def list_departments(db: AsyncSession) -> list[Department]:
    result = await db.execute(
        select(Department)
        .where(Department.deleted_at.is_(None))
        .order_by(Department.name)
    )
    return list(result.scalars().all())


async def get_department(db: AsyncSession, dept_id: uuid.UUID) -> Department | None:
    result = await db.execute(
        select(Department).where(
            Department.id == dept_id, Department.deleted_at.is_(None)
        )
    )
    return result.scalar_one_or_none()


async def update_department(
    db: AsyncSession, dept: Department, data: DepartmentUpdate
) -> Department:
    if data.name is not None:
        dept.name = data.name
    if data.description is not None:
        dept.description = data.description
    if data.is_active is not None:
        dept.is_active = data.is_active
    await db.flush()
    return dept


async def soft_delete_department(db: AsyncSession, dept: Department) -> None:
    dept.deleted_at = datetime.now(UTC)
    await db.flush()
