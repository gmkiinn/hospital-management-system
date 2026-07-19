import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import (
    Base,
    SoftDeleteMixin,
    TenantMixin,
    TimestampMixin,
    UUIDPrimaryKeyMixin,
)
from app.models.enums import AppointmentSource, AppointmentStatus


class Appointment(
    Base, UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, SoftDeleteMixin
):
    __tablename__ = "appointments"
    __table_args__ = (
        UniqueConstraint("doctor_id", "slot_start", name="uq_appointments_doctor_slot"),
    )

    doctor_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    booked_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    slot_start: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    slot_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    source: Mapped[AppointmentSource] = mapped_column(
        Enum(
            AppointmentSource,
            name="appointment_source",
            values_callable=lambda e: [m.value for m in e],
        ),
        nullable=False,
    )
    status: Mapped[AppointmentStatus] = mapped_column(
        Enum(
            AppointmentStatus,
            name="appointment_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=AppointmentStatus.BOOKED,
        nullable=False,
        index=True,
    )
    token_number: Mapped[int | None] = mapped_column(nullable=True)
    paid: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=text("false")
    )
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
