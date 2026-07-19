from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.hospital import Hospital
from app.models.patient import Patient
from app.schemas.scheduling import DaySlots, Slot, SlotSession

_UTC = ZoneInfo("UTC")


async def _hospital_timezone(db: AsyncSession, hospital_id) -> str:
    result = await db.execute(
        select(Hospital.timezone).where(Hospital.id == hospital_id)
    )
    return result.scalar_one_or_none() or "UTC"


async def get_day_slots(
    db: AsyncSession, doctor: Doctor, target_date: date
) -> DaySlots:
    """Generate the doctor's slot grid for one date, tagged with live statuses.

    Sessions are local clock times (hospital timezone); slots are emitted with
    timezone-aware UTC starts so the client can book them back verbatim.
    """
    tz_name = await _hospital_timezone(db, doctor.hospital_id)
    tz = ZoneInfo(tz_name)

    # Day bounds (local midnight → next midnight), in UTC, to scope the query.
    day_start = datetime.combine(target_date, time.min, tzinfo=tz).astimezone(_UTC)
    day_end = day_start + timedelta(days=1)

    rows = await db.execute(
        select(Appointment, Patient.full_name)
        .join(Patient, Patient.id == Appointment.patient_id)
        .where(
            Appointment.doctor_id == doctor.id,
            Appointment.deleted_at.is_(None),
            Appointment.slot_start >= day_start,
            Appointment.slot_start < day_end,
        )
    )
    # Key by the UTC instant so it matches generated slot starts regardless of tzinfo.
    booked: dict[datetime, tuple[Appointment, str]] = {
        appt.slot_start.astimezone(_UTC): (appt, name) for appt, name in rows.all()
    }

    duration = timedelta(minutes=doctor.slot_duration_minutes)
    now_utc = datetime.now(_UTC)
    sessions_out: list[SlotSession] = []

    for session in doctor.sessions:
        start_local = _combine(target_date, session["start"], tz)
        end_local = _combine(target_date, session["end"], tz)
        slots: list[Slot] = []
        cursor = start_local
        while cursor + duration <= end_local:
            slot_start = cursor.astimezone(_UTC)
            entry = booked.get(slot_start)
            if entry is not None:
                appt, patient_name = entry
                slots.append(
                    Slot(
                        slot_start=slot_start,
                        slot_end=(cursor + duration).astimezone(_UTC),
                        label=cursor.strftime("%H:%M"),
                        status=appt.status.value,
                        appointment_id=appt.id,
                        patient_id=appt.patient_id,
                        patient_name=patient_name,
                        paid=appt.paid,
                        token_number=appt.token_number,
                    )
                )
            else:
                # A free slot whose time has already passed can't be booked.
                is_past = slot_start < now_utc
                slots.append(
                    Slot(
                        slot_start=slot_start,
                        slot_end=(cursor + duration).astimezone(_UTC),
                        label=cursor.strftime("%H:%M"),
                        status="past" if is_past else "available",
                    )
                )
            cursor += duration
        sessions_out.append(
            SlotSession(
                label=session.get("label", ""),
                start=session["start"],
                end=session["end"],
                slots=slots,
            )
        )

    return DaySlots(
        doctor_id=doctor.id,
        date=target_date,
        timezone=tz_name,
        slot_duration_minutes=doctor.slot_duration_minutes,
        sessions=sessions_out,
    )


def _combine(target_date: date, hhmm: str, tz: ZoneInfo) -> datetime:
    hour, minute = (int(part) for part in hhmm.split(":"))
    return datetime.combine(target_date, time(hour, minute), tzinfo=tz)
