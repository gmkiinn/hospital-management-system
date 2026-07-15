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

## 8. Running log of steps

> Newest at the bottom. Each entry: what we did + why.

- **Step 1 — Repo scaffold.** Created private GitHub repo with README + Python
  `.gitignore`. Cloned locally. Set up git identity + `gh` CLI auth. Created
  `backend/` and `frontend/` folders (monorepo). Learned: git doesn't track empty
  folders — a tracked file is needed inside each.
- **Step 1.5 — Project doc.** Added this `docs/PROJECT_GUIDE.md` as the living
  reference. *(← you are here)*
- **Next — Backend project setup** (professional Python foundation): dependency
  manager, virtual env, app structure, config/settings, linting/formatting,
  pre-commit hooks.
