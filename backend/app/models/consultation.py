import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import ProcessingStatus


class Consultation(Base, UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin):
    __tablename__ = "consultations"

    appointment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("appointments.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    # Consent gate — audio may not be uploaded until this is true.
    recording_consent: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    consented_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    audio_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    processing_status: Mapped[ProcessingStatus] = mapped_column(
        Enum(
            ProcessingStatus,
            name="processing_status",
            values_callable=lambda e: [m.value for m in e],
        ),
        default=ProcessingStatus.PENDING,
        nullable=False,
    )
    # AI outputs kept separate from the doctor's final, approved note.
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_summary_draft: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    final_summary: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
