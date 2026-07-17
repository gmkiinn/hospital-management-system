# Hospital Management System — Project Guide

> Living document. Captures **what** we are building, **why** we made each decision,
> and a **running log** of the steps taken. Meant to double as a reusable reference
> for future projects.

---

## 1. Product overview

An AI-powered Hospital Management System (Healthcare SaaS) that digitizes the full
patient consultation workflow: online + walk-in appointment booking on a single
shared queue, a live queue with notifications, an AI medical scribe (voice →
transcript → summary → prescription draft), doctor approval, and automatic pharmacy
handoff.

**Primary goals:** reduce patient waiting time, improve doctor efficiency, eliminate
paper prescriptions, automate doctor ↔ patient ↔ pharmacy communication.

**Launch scope decisions:**
- **Market / compliance:** India-first, **DPDP Act 2023**. Data hosted in an India
  region (AWS/GCP Mumbai).
- **Tenancy:** single-tenant pilot, but every table carries `hospital_id` +
  Postgres Row-Level Security from day one, so multi-tenant is a config change later.

---

## 2. Roles & capabilities (functional requirements)

- **Admin** — manage doctors, departments, receptionists, pharmacists; configure
  hospital timings, slot duration, notification settings; view appointments, reports,
  audit logs.
- **Receptionist** — register/search patients; book/cancel/reschedule walk-in
  appointments on the shared slot grid; mark patient arrived; view schedule & queue.
- **Patient** — register/login; manage profile & consent; search/filter doctors;
  book/cancel/reschedule; track queue position; receive notifications; view & download
  prescriptions and history.
- **Doctor** — view today's appointments & patient history; record consultation;
  review/edit AI transcript & summary; generate + digitally sign prescription; send to
  pharmacy; complete consultation.
- **Pharmacist** — receive prescriptions in real time; update medicine availability;
  mark preparing/ready/collected; trigger "medicine ready" notification.

---

## 3. Non-functional requirements

- **Performance:** p95 API response < 2s; atomic slot booking under concurrency.
- **Security:** argon2/bcrypt password hashing, JWT access + refresh, strict RBAC on
  every route, field-level encryption for PHI, TLS everywhere, rate limiting on public
  endpoints.
- **Compliance (DPDP 2023):** explicit consent at registration + before AI recording,
  purpose limitation, data retention + auto-purge, right-to-access/erasure, breach
  notification, India-region hosting.
- **Auditability:** append-only audit log of every read/write to a patient record.
- **Reliability:** DB-enforced no double-booking, notification retries with backoff,
  idempotent event/webhook handlers.
- **Scalability:** stateless API behind a load balancer; `hospital_id` on every
  tenant-scoped table.
- **Accessibility:** responsive mobile/tablet/desktop, WCAG AA on patient screens.

---

## 4. Architecture

**Style:** modular monolith — one deployable FastAPI service, internally split into
bounded modules that own their own tables and talk via service interfaces (so any
module can be extracted into its own service later).

Modules: Auth · Hospital Config · Patient Registry · Appointment & Queue ·
Consultation (AI Scribe) · Prescription & Pharmacy · Notifications.

Key design rules:
- **Booking integrity:** unique constraint on `(doctor_id, slot_start)` + DB
  transaction — never rely on application-level checks for this.
- **Real-time queue:** WebSocket connections at the API layer, backed by Redis pub/sub
  so multiple API processes stay consistent.
- **AI pipeline (async, off the request path):** stop recording → audio to S3 → Celery
  worker transcribes (Whisper) → RAG pulls patient history/allergies from
  Postgres+pgvector → GPT drafts summary + prescription → **doctor reviews & approves**
  → approval event creates pharmacy record + patient notification. Every AI draft is
  stored next to the doctor's final edit → becomes the evaluation dataset.
- **Human-in-the-loop is a hard invariant:** AI never auto-sends anything to a patient
  or pharmacy without doctor approval.

---

## 5. Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript, Tailwind CSS, Redux Toolkit, React Query, React Router |
| Backend | Python, FastAPI, SQLAlchemy, Pydantic |
| Database | PostgreSQL + pgvector |
| Cache / broker / pub-sub | Redis |
| Background jobs | Celery |
| AI | OpenAI GPT (summary, prescription draft), Whisper (speech-to-text) |
| Real-time | WebSockets (Redis-backed) |
| Object storage | AWS S3 (Mumbai) |
| Notifications | Twilio (SMS/WhatsApp), Firebase Cloud Messaging (push), email provider |
| Auth | JWT + refresh tokens, argon2/bcrypt |
| Migrations | Alembic |
| Testing | pytest (backend), Vitest + React Testing Library (frontend) |
| CI/CD | GitHub Actions |
| Hosting | Docker on AWS ECS Fargate (or Render/Railway for the pilot), RDS Postgres, ElastiCache Redis |
| Error tracking | Sentry |

---

## 6. Team & workflow

- **Two-person team:** Mahesh (backend), wife (frontend). Independent work, synced
  through GitHub.
- **Repo:** monorepo — `backend/` + `frontend/` in one repo.
- **Git workflow:** feature branches → PR → review → merge to `main`. No direct pushes
  to `main`.
- **Commit identity:** each person commits under their own git name/email.

---

## 7. Delivery phases

1. **Foundation** — auth + RBAC, hospital/department/doctor management, patient
   registration, booking + shared slot grid, live queue. *(No AI yet — a fully working
   non-AI hospital system.)*
2. **AI flagship** — consultation recording, transcription, AI summary + prescription
   draft with doctor approval, pharmacy handoff.
3. **Polish** — multi-channel notifications, full history, PDF downloads, audit log UI,
   DPDP consent/erasure flows.

---

## 8. Detailed build roadmap

> Every step from foundation to production. Each backend step is a `feature/<name>`
> branch → PR → merge. The frontend counterpart is built in parallel by the wife.
> Ordering logic: a working non-AI system first (Phase 1), then the high-risk AI on a
> stable base (Phase 2), then polish/compliance (Phase 3), then productionize (Phase 4).

### ✅ Done — Foundation
- **Repo & monorepo scaffold** — GitHub repo, `backend/` + `frontend/`, git identity,
  branch/PR workflow, `.gitignore`.
- **Backend skeleton** — FastAPI + uv, typed env config, modular `app/` package,
  health endpoint, ruff, repo-wide pre-commit.
- **Frontend skeleton** — React + Vite (pinned v7) + TypeScript, Tailwind v4,
  ESLint + Prettier, frontend hooks wired into pre-commit.

### 🔵 Phase 1 — Core hospital system (no AI)

**Step 3 — Database schema** *(current)*
- Run Postgres + `pgvector` locally via Docker Compose (matches prod DB version).
- Add SQLAlchemy (async) + Alembic; configure the DB connection/session.
- Model the 6 core tables: `hospitals`, `users`, `departments`, `doctors`,
  `patients`, `appointments`.
- Bake in the standards: UUID primary keys, `hospital_id` on every table with
  Row-Level Security policies, `created_at`/`updated_at` on every table, and the
  `UNIQUE (doctor_id, slot_start)` constraint that makes double-booking impossible.
- Generate the first Alembic migration and apply it.

**Step 4 — Authentication & RBAC**
- Registration + login endpoints; hash passwords with argon2/bcrypt.
- Issue JWT access tokens + refresh tokens; refresh + logout flow.
- RBAC dependency/middleware guarding every route by role (admin, receptionist,
  patient, doctor, pharmacist).
- Forgot/reset password flow.

**Step 5 — Hospital configuration (admin)**
- Admin CRUD for departments and doctors.
- Per-doctor consultation timings (weekday windows) and slot duration.
- Logic that turns a doctor's timings + slot duration into bookable slots.

**Step 6 — Patient management**
- Patient registration (by patient online, or by receptionist for walk-ins).
- Profile fields: demographics, blood group, allergies, emergency contact.
- Patient search (by name/phone/ID); medical-history data model & retrieval.

**Step 7 — Appointments & live queue**
- Booking on the shared slot grid from both online and walk-in paths, both hitting
  the same DB constraint → no double-booking under concurrency.
- Cancel / reschedule; mark patient arrived.
- Token numbers + a per-doctor live queue; real-time position updates pushed over
  WebSocket, backed by Redis pub/sub so it works across multiple API processes.

**Phase 1 frontend (parallel):** login/register pages, role-based dashboards
(admin/reception/doctor/patient/pharmacy shells), doctor search & availability,
booking UI, live queue view.

### 🟣 Phase 2 — AI flagship

**Step 8 — Consultation capture**
- Doctor "start/stop recording" flow; capture audio in the browser.
- Upload audio to S3 (private bucket, short-TTL signed URLs, encrypted at rest).
- Create a consultation record linked to the appointment.

**Step 9 — AI medical scribe (async pipeline)**
- Celery worker + Redis broker so heavy AI work stays off the request path.
- Whisper transcription of the audio → transcript stored.
- RAG step: pull the patient's relevant history/allergies/current meds from
  Postgres + pgvector as grounding context.
- GPT generates a structured summary (chief complaint, symptoms, diagnosis, plan)
  + a suggested prescription draft, grounded in that context; flag drug-interaction risks.
- **Doctor review & approval gate** — nothing is final until the doctor edits/approves.
  Store the AI draft alongside the doctor's final version (this becomes the eval dataset).

**Step 10 — Digital prescription**
- Structured entry: medicine, dosage, frequency, duration.
- Doctor digital signature; permanent immutable storage.
- PDF generation for download.

**Step 11 — Pharmacy handoff**
- "Complete consultation" fires an event that creates a pharmacy record.
- Pharmacy dashboard: new prescriptions, status transitions (preparing → ready →
  collected); "medicine ready" triggers a patient notification.

### 🟠 Phase 3 — Polish & compliance

**Step 12 — Notifications**
- Channels: email, SMS (Twilio), push (FCM). Events: booking confirmed, doctor
  delayed, N patients remaining, your-turn-soon, prescription/medicine ready.
- Retry with backoff; idempotent handlers.

**Step 13 — History & downloads**
- Full consultation-history views for patient and doctor.
- Prescription PDF downloads; patient dashboard aggregation.

**Step 14 — DPDP compliance**
- Explicit consent capture at registration and before AI recording.
- Append-only audit log of every read/write to a patient record.
- Data access & erasure (right-to-be-forgotten) workflows; retention/auto-purge.

### ⚙️ Phase 4 — Production readiness (DevOps)

**Step 15 — Testing**
- pytest (backend, incl. async + DB fixtures) and Vitest + React Testing Library
  (frontend); coverage thresholds.

**Step 16 — CI/CD**
- GitHub Actions: on every PR run lint → typecheck → test → build; block merge on failure.
- Deploy pipeline on merge to `main`.

**Step 17 — Deployment**
- Dockerize backend, worker, and frontend build.
- AWS in Mumbai region: ECS Fargate (API + worker), RDS Postgres, ElastiCache Redis,
  S3, ALB, secrets in a manager.

**Step 18 — Observability & hardening**
- Sentry error tracking, structured JSON logs, health/readiness probes.
- Rate limiting on public endpoints, field-level PHI encryption, security review.

---

## 9. Running log of steps

> Newest at the bottom. Each entry: what we did + why.

- **Step 1 — Repo scaffold.** Created private GitHub repo with README + Python
  `.gitignore`. Cloned locally. Set up git identity + `gh` CLI auth. Created
  `backend/` and `frontend/` folders (monorepo). Learned: git doesn't track empty
  folders — a tracked file is needed inside each.
- **Step 1.5 — Project doc.** Added this `docs/PROJECT_GUIDE.md` as the living
  reference.
- **Step 2 — Backend foundation.** Chose `uv` for dependency management (fast,
  reproducible via `uv.lock`, pins Python 3.13). Added runtime deps (`fastapi`,
  `uvicorn[standard]`, `pydantic-settings`) and dev deps (`ruff`, `pytest`,
  `pytest-asyncio`, `httpx`, `pre-commit`). Laid out a modular `app/` package
  (`core/` for config, `api/routes/` for endpoints, `tests/`). Wrote typed settings
  loaded from env (`app/core/config.py`), a modular health router, and a thin
  `app/main.py` that assembles routers under an `/api/v1` prefix. Verified the
  server runs and `GET /api/v1/health` returns `{"status":"ok"}` with free Swagger
  docs at `/docs`. Added `ruff` config (lint families E/W/F/I/B/C4/UP + formatter)
  and repo-root `pre-commit` hooks (whitespace/EOF/yaml/large-files/merge-conflict +
  ruff lint & format, scoped to `backend/`). Foundation commits went directly to
  `main`; feature branches start with the next step.
- **Step 2.5 — Frontend foundation.** Confirmed React SPA (Vite) over Next.js —
  cleaner fit for an auth-gated dashboard app with a separate FastAPI backend, and
  simple static hosting in the Mumbai region. Scaffolded Vite + React + TypeScript.
  Hit npm's optional-deps bug with Vite 8's rolldown bundler (missing native binding);
  fixed by pinning `vite@^7.3.6` + `@vitejs/plugin-react@^5.2.0`. Added Tailwind CSS
  v4 via its Vite plugin (no config file — single `@import "tailwindcss"`). Removed
  Vite starter boilerplate. Set up Prettier + `eslint-config-prettier` alongside the
  template's ESLint (ESLint = code quality, Prettier = formatting), with `format` /
  `format:check` npm scripts. Wired the frontend into the repo-root `pre-commit` via
  `local` hooks (one hook manager for the whole repo — no husky), scoped to
  `frontend/`. Committed under Mahesh's identity (scaffolding); wife commits under
  her own name from feature work on.
- **Next — Step 3: Database schema** (first feature-branch work): design Postgres
  models with `hospital_id` + Row-Level Security on every table, and the
  `(doctor_id, slot_start)` unique constraint that makes double-booking impossible.
  Tooling: SQLAlchemy models + Alembic migrations, Postgres running via Docker.
