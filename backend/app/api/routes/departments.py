import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, require_roles
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.department import (
    DepartmentCreate,
    DepartmentResponse,
    DepartmentUpdate,
)
from app.services import department_service

router = APIRouter(prefix="/departments", tags=["departments"])


@router.post("", response_model=DepartmentResponse, status_code=status.HTTP_201_CREATED)
async def create_department(
    payload: DepartmentCreate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> DepartmentResponse:
    dept = await department_service.create_department(db, admin.hospital_id, payload)
    await db.commit()
    return DepartmentResponse.model_validate(dept)


@router.get("", response_model=list[DepartmentResponse])
async def list_departments(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
) -> list[DepartmentResponse]:
    depts = await department_service.list_departments(db)
    return [DepartmentResponse.model_validate(d) for d in depts]


@router.patch("/{dept_id}", response_model=DepartmentResponse)
async def update_department(
    dept_id: uuid.UUID,
    payload: DepartmentUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> DepartmentResponse:
    dept = await department_service.get_department(db, dept_id)
    if dept is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Department not found"
        )
    dept = await department_service.update_department(db, dept, payload)
    await db.commit()
    return DepartmentResponse.model_validate(dept)


@router.delete("/{dept_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    dept_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_roles(UserRole.ADMIN)),
) -> None:
    dept = await department_service.get_department(db, dept_id)
    if dept is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Department not found"
        )
    await department_service.soft_delete_department(db, dept)
    await db.commit()
