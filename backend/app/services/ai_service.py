import json

from openai import AsyncOpenAI

from app.core.config import settings
from app.schemas.consultation import ClinicalSummary

_SYSTEM_PROMPT = (
    "You are a clinical documentation assistant creating a DRAFT for a doctor to "
    "review. Rules: use ONLY information present in the transcript; do not invent "
    "facts; use neutral, non-committal language where information is uncertain; this "
    "is a draft, NOT a confirmed diagnosis or prescription. Return ONLY valid JSON "
    "with these keys: chief_complaint (string), history_of_present_illness (string), "
    "symptoms (array of strings), diagnosis (string), treatment_plan (string), "
    "follow_up (string)."
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
    "chief_complaint": "Fever and productive cough for three days.",
    "history_of_present_illness": (
        "Three-day history of fever and cough with intermittent shortness of breath "
        "and fatigue. No chest pain. No history of asthma."
    ),
    "symptoms": ["fever", "cough", "shortness of breath", "fatigue"],
    "diagnosis": (
        "Likely lower respiratory tract infection (clinical impression, to be "
        "confirmed)."
    ),
    "treatment_plan": (
        "Empirical antibiotics and antipyretics. Advise rest and oral fluids."
    ),
    "follow_up": "Review in five days if symptoms do not improve.",
}


async def transcribe_audio(audio_path: str) -> str:
    if not settings.openai_api_key:
        return _MOCK_TRANSCRIPT
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    with open(audio_path, "rb") as fh:
        response = await client.audio.transcriptions.create(
            model=settings.openai_transcription_model, file=fh
        )
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
    # Validate/normalize against the clinical schema before persisting.
    return ClinicalSummary.model_validate(json.loads(content)).model_dump()
