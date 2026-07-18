from sqlalchemy import Boolean, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import (
    Base,
    SoftDeleteMixin,
    TenantMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)


class Department(
    Base, UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, SoftDeleteMixin
):
    __tablename__ = "departments"
    __table_args__ = (
        UniqueConstraint("hospital_id", "name", name="uq_departments_hospital_name"),
    )

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
