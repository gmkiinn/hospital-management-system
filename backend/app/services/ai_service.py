import json

from openai import AsyncOpenAI

from app.core.config import settings
from app.schemas.consultation import PrescriptionNote

_SYSTEM_PROMPT = (
    "You are a clinical documentation assistant creating a DRAFT prescription for a "
    "doctor to review. Rules: use ONLY information present in the transcript; do not "
    "invent medications or doses; this is a draft, NOT a confirmed prescription. "
    "Return ONLY valid JSON with these keys: "
    "summary (string: a concise plain-language summary of the consultation, "
    "including complaint, findings, and advice), "
    "medications (array of objects, each with: name (string, the medicine), "
    "morning (bool), afternoon (bool), evening (bool), night (bool) for dose "
    "timing, meal ('before' or 'after' food), duration (string, e.g. '5 days')). "
    "meal MUST be exactly 'before' or 'after' - if it is not stated, use 'after'. "
    "If a medicine's timing is unclear, set only the booleans you are confident "
    "about and leave the rest false. Use an empty medications array if none are "
    "mentioned."
)

_MOCK_TRANSCRIPT = (
    "Doctor: Good morning, what brings you in today? "
    "Patient: I've had a fever and a bad cough for the last three days. "
    "Doctor: Any breathing difficulty or chest pain? "
    "Patient: No chest pain, but I feel short of breath sometimes and very tired. "
    "Doctor: Any history of asthma? Patient: No. "
    "Doctor: Alright, it looks like a chest infection. I'll start you on antibiotics "
    "and something for the fever. Rest and plenty of fluids. Come back in five days "
    "if it doesn't improve."
)

_MOCK_SUMMARY = {
    "summary": (
        "Three-day history of fever and productive cough with intermittent "
        "shortness of breath and fatigue. No chest pain and no history of asthma. "
        "Clinical impression: likely lower respiratory tract infection. Advised "
        "rest and oral fluids, with review in five days if symptoms do not improve."
    ),
    "medications": [
        {
            "name": "Paracetamol 500mg",
            "morning": True,
            "afternoon": False,
            "evening": False,
            "night": True,
            "meal": "after",
            "duration": "5 days",
        },
        {
            "name": "Azithromycin 500mg",
            "morning": True,
            "afternoon": False,
            "evening": False,
            "night": False,
            "meal": "after",
            "duration": "3 days",
        },
    ],
}


_BOOKING_PROMPT = (
    "You extract appointment-booking details from a receptionist's spoken request "
    "(already translated to English). Return ONLY valid JSON with these keys: "
    "full_name (string), phone (string of digits only, no spaces or symbols), "
    "gender ('male' | 'female' | 'other' | null), email (string | null), "
    "address (string | null), paid (boolean — true only if payment is said to be "
    "done), reason (string | null, the complaint), doctor_name (string | null — the "
    "doctor mentioned), date (string | null — as said, e.g. 'today', 'tomorrow', "
    "'2026-07-20', or a weekday), time (string | null — e.g. '10:30', '10:30 am', "
    "'6 pm', 'morning', 'evening'). Use null for anything not stated. Never invent "
    "values."
)

# Used when no OpenAI key is configured (local/dev), so the flow is testable.
_MOCK_BOOKING = {
    "full_name": "Ramesh Kumar",
    "phone": "9876543210",
    "gender": "male",
    "email": None,
    "address": "MG Road, Bengaluru",
    "paid": True,
    "reason": "fever and cough",
    "doctor_name": None,
    "date": "today",
    "time": "morning",
}


async def extract_booking(transcript: str) -> dict:
    """Pull structured booking fields out of the receptionist's request."""
    if not settings.openai_api_key:
        return dict(_MOCK_BOOKING)
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.chat.completions.create(
        model=settings.openai_summary_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _BOOKING_PROMPT},
            {"role": "user", "content": transcript},
        ],
    )
    return json.loads(response.choices[0].message.content or "{}")


async def transcribe_to_english(audio_path: str) -> str:
    """Transcribe audio to English, whatever language was actually spoken.

    Uses Whisper's translation task: it auto-detects the source language
    (including Indian regional languages) and returns English. No language
    hint is sent, so it can't trip a model's "unsupported_language" error.
    """
    if not settings.openai_api_key:
        return _MOCK_TRANSCRIPT
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    with open(audio_path, "rb") as fh:
        response = await client.audio.translations.create(model="whisper-1", file=fh)
    return response.text


async def summarize_transcript(transcript: str) -> dict:
    if not settings.openai_api_key:
        return _MOCK_SUMMARY
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    response = await client.chat.completions.create(
        model=settings.openai_summary_model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Consultation transcript:\n{transcript}",
            },
        ],
    )
    content = response.choices[0].message.content or "{}"
    # Validate/normalize against the prescription schema before persisting.
    return PrescriptionNote.model_validate(json.loads(content)).model_dump()
