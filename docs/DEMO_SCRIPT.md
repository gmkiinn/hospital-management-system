# 🎬 Demo Script — AI Medical Scribe

A 5–7 minute live walkthrough for judges. It takes you from an empty hospital to an
**AI-drafted, doctor-approved clinical note**. Run it in the Swagger UI at
**http://127.0.0.1:8000/docs** (curl equivalents are included for each step).

> **Before you start** (one-time):
> ```bash
> docker compose up -d                 # database
> cd backend
> uv run alembic upgrade head          # schema
> uv run python -m scripts.seed        # demo hospital + admin
> uv run uvicorn app.main:app --reload # API
> ```
> With `OPENAI_API_KEY` set in `backend/.env`, transcription + summary are **live**. Without it,
> the scribe returns a realistic **mock** — the flow is identical, so the demo works either way.

---

## The story you're telling

> "A patient walks into the OPD. The front desk registers them and books an appointment. The
> doctor sees them, records the consult, and instead of typing notes, our AI writes a structured
> clinical draft. The doctor reviews it, approves it, and the visit is done — all in the time it
> used to take just to write the note."

Roles you'll use:
- **admin@demo.com** — sets up the department, the doctor, the patient, and books the appointment.
- **the doctor** (created in Step 2) — runs the consultation and the scribe.

> 💡 **Swagger auth tip:** After each login, copy the `access_token` from the response, click the
> green **Authorize** button (top-right), paste the token, and Authorize. Every request below is
> sent as the currently-authorized user.

---

## Step 0 — Log in as admin

**`POST /api/v1/auth/login`**
```json
{ "email": "admin@demo.com", "password": "admin12345" }
```
➡️ Copy `access_token` → **Authorize** in Swagger.

<details><summary>curl</summary>

```bash
BASE=http://127.0.0.1:8000/api/v1
ADMIN=$(curl -s $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@demo.com","password":"admin12345"}' | jq -r .access_token)
```
</details>

---

## Step 1 — Create a department

**`POST /api/v1/departments`**
```json
{ "name": "General Medicine", "description": "OPD — general consultations" }
```
➡️ Note the returned department **`id`** (you'll need it for the doctor).

<details><summary>curl</summary>

```bash
DEPT=$(curl -s $BASE/departments -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"General Medicine","description":"OPD"}' | jq -r .id)
```
</details>

---

## Step 2 — Onboard a doctor (this also creates their login)

**`POST /api/v1/doctors`** — use the `department_id` from Step 1.
```json
{
  "email": "dr.rahul@demo.com",
  "password": "doctor12345",
  "full_name": "Dr. Rahul Sharma",
  "department_id": "<DEPARTMENT_ID>",
  "specialization": "General Physician",
  "qualification": "MBBS, MD",
  "slot_duration_minutes": 15
}
```
➡️ Note the returned doctor **`id`**.

<details><summary>curl</summary>

```bash
DOCTOR=$(curl -s $BASE/doctors -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"dr.rahul@demo.com\",\"password\":\"doctor12345\",\"full_name\":\"Dr. Rahul Sharma\",\"department_id\":\"$DEPT\",\"specialization\":\"General Physician\",\"qualification\":\"MBBS, MD\",\"slot_duration_minutes\":15}" | jq -r .id)
```
</details>

---

## Step 3 — Register a patient

**`POST /api/v1/patients`**
```json
{
  "full_name": "Anita Verma",
  "phone": "9876543210",
  "gender": "female",
  "blood_group": "O+",
  "allergies": "None known"
}
```
➡️ Note the returned patient **`id`**.

<details><summary>curl</summary>

```bash
PATIENT=$(curl -s $BASE/patients -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' \
  -d '{"full_name":"Anita Verma","phone":"9876543210","gender":"female","blood_group":"O+"}' | jq -r .id)
```
</details>

---

## Step 4 — Book the appointment

**`POST /api/v1/appointments`** — use the doctor + patient ids. Pick any future time for
`slot_start` (ISO 8601).
```json
{
  "doctor_id": "<DOCTOR_ID>",
  "patient_id": "<PATIENT_ID>",
  "slot_start": "2026-07-20T10:00:00Z",
  "source": "walk_in",
  "reason": "Fever and cough for 3 days"
}
```
➡️ Note the appointment **`id`**.

> 🎯 **Wow moment (optional):** submit the **same** body again → **409 Conflict**
> ("that doctor already has an appointment at this time"). No double-booking, enforced by the DB.

<details><summary>curl</summary>

```bash
APPT=$(curl -s $BASE/appointments -H "Authorization: Bearer $ADMIN" \
  -H 'Content-Type: application/json' \
  -d "{\"doctor_id\":\"$DOCTOR\",\"patient_id\":\"$PATIENT\",\"slot_start\":\"2026-07-20T10:00:00Z\",\"source\":\"walk_in\",\"reason\":\"Fever and cough for 3 days\"}" | jq -r .id)
```
</details>

---

## Step 5 — Patient arrives (gets a queue token)

**`POST /api/v1/appointments/{appointment_id}/arrive`**
➡️ Response shows `status: "arrived"` and a `token_number` — the OPD queue position.

<details><summary>curl</summary>

```bash
curl -s -X POST $BASE/appointments/$APPT/arrive -H "Authorization: Bearer $ADMIN" | jq
```
</details>

---

## Step 6 — Switch to the doctor

**`POST /api/v1/auth/login`**
```json
{ "email": "dr.rahul@demo.com", "password": "doctor12345" }
```
➡️ Copy the new `access_token` → **Authorize** in Swagger (now acting as the doctor).

<details><summary>curl</summary>

```bash
DOC=$(curl -s $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"dr.rahul@demo.com","password":"doctor12345"}' | jq -r .access_token)
```
</details>

---

## Step 7 — Start the consultation

**`POST /api/v1/appointments/{appointment_id}/consultation`**
➡️ Returns a **consultation** object. Note its **`id`**. The appointment moves to
`in_consultation`.

<details><summary>curl</summary>

```bash
CONS=$(curl -s -X POST $BASE/appointments/$APPT/consultation -H "Authorization: Bearer $DOC" | jq -r .id)
```
</details>

---

## Step 8 — Capture consent (required before recording)

**`POST /api/v1/consultations/{consultation_id}/consent`**
```json
{ "recording_consent": true }
```

> 🔒 **Privacy checkpoint (optional):** skip this step and try Step 9 → **403 Forbidden**.
> Audio cannot be uploaded without recorded consent. This is the DPDP-minded guardrail.

<details><summary>curl</summary>

```bash
curl -s -X POST $BASE/consultations/$CONS/consent -H "Authorization: Bearer $DOC" \
  -H 'Content-Type: application/json' -d '{"recording_consent":true}' | jq
```
</details>

---

## Step 9 — ⭐ Upload the consultation audio (the scribe kicks in)

**`POST /api/v1/consultations/{consultation_id}/audio`** — attach an audio file
(`.mp3`, `.wav`, `.m4a`, `.webm`, …).
➡️ Returns immediately with `processing_status: "pending"`. Transcription + summary run in the
**background**.

> Don't have a clip handy? With `OPENAI_API_KEY` **unset**, any small audio file works — the
> scribe returns a realistic mock so you can still demo the full flow.

<details><summary>curl</summary>

```bash
curl -s -X POST $BASE/consultations/$CONS/audio -H "Authorization: Bearer $DOC" \
  -F "file=@/path/to/consult.m4a" | jq
```
</details>

---

## Step 10 — ⭐ Watch the AI draft appear

**`GET /api/v1/consultations/{consultation_id}`** — call it a few times.
➡️ `processing_status` moves **pending → transcribing → summarizing → ready**. When `ready`:
- **`transcript`** — the full conversation text.
- **`ai_summary_draft`** — a structured clinical note: `chief_complaint`,
  `history_of_present_illness`, `symptoms[]`, `diagnosis`, `treatment_plan`, `follow_up`.

**This is the headline moment** — a doctor-ready draft generated from speech, with no typing.

<details><summary>curl</summary>

```bash
curl -s $BASE/consultations/$CONS -H "Authorization: Bearer $DOC" | jq '{processing_status, transcript, ai_summary_draft}'
```
</details>

---

## Step 11 — Doctor reviews & approves the final note

The doctor edits the draft as needed and saves it as the official note.

**`PATCH /api/v1/consultations/{consultation_id}/final-note`**
```json
{
  "final_summary": {
    "chief_complaint": "Fever and productive cough for three days.",
    "history_of_present_illness": "Three-day history of fever and cough with intermittent shortness of breath and fatigue. No chest pain. No history of asthma.",
    "symptoms": ["fever", "cough", "shortness of breath", "fatigue"],
    "diagnosis": "Likely lower respiratory tract infection (to be confirmed).",
    "treatment_plan": "Empirical antibiotics and antipyretics. Rest and oral fluids.",
    "follow_up": "Review in five days if symptoms do not improve."
  }
}
```
➡️ `final_summary` is saved, `reviewed_at` is stamped, and the **appointment status becomes
`completed`**. The visit is closed.

<details><summary>curl</summary>

```bash
curl -s -X PATCH $BASE/consultations/$CONS/final-note -H "Authorization: Bearer $DOC" \
  -H 'Content-Type: application/json' \
  -d '{"final_summary":{"chief_complaint":"Fever and productive cough for three days.","history_of_present_illness":"Three-day history of fever and cough...","symptoms":["fever","cough"],"diagnosis":"Likely lower respiratory tract infection.","treatment_plan":"Antibiotics and antipyretics.","follow_up":"Review in five days."}}' | jq
```
</details>

---

## 🎤 Closing line for judges

> "The doctor spoke to the patient, and the system produced a structured, editable clinical note —
> keeping the doctor in control and the patient's consent on record. Everything is tenant-isolated
> at the database level, so the same backend safely serves one clinic today or a hundred
> hospitals tomorrow."

## 🧯 Quick troubleshooting

| Symptom | Fix |
|---|---|
| `401 Unauthorized` on a protected call | Token expired or wrong role — re-run the relevant login and re-**Authorize**. |
| `403` on audio upload | Consent not set — do Step 8 first. |
| `processing_status` stuck at `failed` | Check `error_message` in the response; usually a bad/oversized audio file or an OpenAI key issue. |
| `409` when booking | You reused a taken slot — change `slot_start`. |
| DB connection errors | `docker compose up -d` and confirm the `hms-postgres` container is running on port 5433. |
