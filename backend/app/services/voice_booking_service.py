"""Turn a receptionist's spoken request into a ready-to-confirm booking draft.

Transcribes the audio (any language → English), extracts the fields with the
LLM, then resolves them against real data: the doctor, the date, and an open
slot. It never books — the receptionist confirms the draft on the board.
"""

import re
import uuid
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.doctor import Doctor
from app.models.hospital import Hospital
from app.schemas.scheduling import Slot
from app.services import ai_service, doctor_service, scheduling_service

_WEEKDAYS = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}


async def build_draft(
    db: AsyncSession,
    hospital_id: uuid.UUID,
    audio_path: str,
    default_doctor_id: str | None,
    default_date: str | None,
) -> dict:
    transcript = await ai_service.transcribe_to_english(audio_path)
    fields = await ai_service.extract_booking(transcript)

    doctors = await doctor_service.list_doctors(db)
    if not doctors:
        raise ValueError("No doctors are configured yet")
    doctor = _match_doctor(fields.get("doctor_name"), doctors, default_doctor_id)

    tz = ZoneInfo(await _hospital_timezone(db, hospital_id))
    target_date = _resolve_date(fields.get("date"), default_date, tz)

    day = await scheduling_service.get_day_slots(db, doctor, target_date)
    slot = _pick_slot(day.sessions, fields.get("time"))

    message = None
    if slot is None:
        message = "Couldn't match an open time — pick a slot on the board to book."

    return {
        "transcript": transcript,
        "doctor_id": doctor.id,
        "doctor_name": doctor.user.full_name,
        "date": target_date,
        "slot_start": slot.slot_start if slot else None,
        "slot_label": slot.label if slot else None,
        "full_name": _clean_str(fields.get("full_name")),
        "phone": _digits(fields.get("phone")),
        "gender": _norm_gender(fields.get("gender")),
        "email": _clean_str(fields.get("email")),
        "address": _clean_str(fields.get("address")),
        "paid": bool(fields.get("paid")),
        "reason": _clean_str(fields.get("reason")),
        "message": message,
    }


async def _hospital_timezone(db: AsyncSession, hospital_id: uuid.UUID) -> str:
    result = await db.execute(
        select(Hospital.timezone).where(Hospital.id == hospital_id)
    )
    return result.scalar_one_or_none() or "UTC"


def _match_doctor(
    name: str | None, doctors: list[Doctor], default_id: str | None
) -> Doctor:
    if name:
        needle = re.sub(r"\bdr\.?\b", "", name.lower()).strip()
        tokens = [t for t in needle.split() if t]
        for d in doctors:
            full = d.user.full_name.lower()
            if needle and (needle in full or any(t in full for t in tokens)):
                return d
    if default_id:
        for d in doctors:
            if str(d.id) == str(default_id):
                return d
    return doctors[0]


def _resolve_date(phrase: str | None, default: str | None, tz: ZoneInfo) -> date:
    today = datetime.now(tz).date()
    if phrase:
        p = phrase.strip().lower()
        if p in ("today", "now", "tonight"):
            return today
        if p in ("tomorrow", "tmrw", "next day"):
            return today + timedelta(days=1)
        try:
            return date.fromisoformat(phrase.strip()[:10])
        except ValueError:
            pass
        if p in _WEEKDAYS:
            ahead = (_WEEKDAYS[p] - today.weekday()) % 7
            return today + timedelta(days=ahead or 7)
    if default:
        try:
            return date.fromisoformat(default.strip()[:10])
        except ValueError:
            pass
    return today


def _pick_slot(sessions, time_phrase: str | None) -> Slot | None:
    available = [
        (session, slot)
        for session in sessions
        for slot in session.slots
        if slot.status == "available"
    ]
    if not available:
        return None
    if time_phrase:
        t = time_phrase.strip().lower()
        # Session word, e.g. "morning" matching the "Morning" session label.
        for session, slot in available:
            label = session.label.lower()
            if label and (t in label or label in t):
                return slot
        hhmm = _parse_time(t)
        if hhmm:
            for _, slot in available:
                if slot.label == hhmm:
                    return slot
        return None  # a time was asked for but nothing matched
    return available[0][1]


def _parse_time(text: str) -> str | None:
    m = re.search(r"(\d{1,2})[:.\s]?(\d{2})?\s*(am|pm)?", text)
    if not m:
        return None
    hour = int(m.group(1))
    minute = int(m.group(2) or 0)
    ap = m.group(3)
    if ap == "pm" and hour < 12:
        hour += 12
    if ap == "am" and hour == 12:
        hour = 0
    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        return None
    return f"{hour:02d}:{minute:02d}"


def _digits(value: str | None) -> str | None:
    if not value:
        return None
    digits = re.sub(r"\D", "", value)
    return digits or None


def _norm_gender(value: str | None) -> str | None:
    if isinstance(value, str) and value.lower() in ("male", "female", "other"):
        return value.lower()
    return None


def _clean_str(value: object) -> str | None:
    if isinstance(value, str) and value.strip():
        return value.strip()
    return None
