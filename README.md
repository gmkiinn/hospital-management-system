# 🏥 AI-Powered Hospital Management System

A production-minded backend that digitizes the patient consultation workflow for hospitals and
clinics — from appointment booking to the consultation room. Its flagship feature is an
**AI medical scribe**: the doctor records the consultation, and the system automatically
**transcribes** it and drafts a **plain-language summary and a structured prescription**
(medications with dose timing) for the doctor to review and approve.

> **Status:** Backend complete (auth → appointments → AI scribe). Interactive API docs live at
> `/docs`. Frontend is a separate track.

---

## ✨ Why this exists

Doctors in busy Indian OPDs spend a large share of each consult typing notes instead of looking at
the patient. This system lets the doctor **just talk to the patient**; the AI writes the first
draft of the clinical note. The doctor stays in control — nothing is finalized until they review
and approve it. Built India-first with **consent captured on every recording** (DPDP Act 2023 in
mind).

## 🚀 Key features

| Area | What it does |
|---|---|
| **Auth & RBAC** | JWT access/refresh tokens; roles: admin, receptionist, doctor, pharmacist, patient. Route-level role guards. |
| **Multi-tenancy (RLS)** | Every table is isolated by hospital using PostgreSQL Row-Level Security. Single-tenant pilot today, multi-tenant-ready from day one. |
| **Departments & doctors** | Admin sets up departments and onboards doctors (each doctor also gets a login). |
| **Patients** | Register and search patients by phone; stores demographics, allergies, emergency contacts. |
| **Appointments** | Booking with **no double-booking** guarantee, walk-in/online source, arrival + **queue token** flow, status lifecycle. |
| **🎙️ AI medical scribe** | Consent gate → audio upload → background **Whisper** transcription → **GPT** summary + structured medications → doctor review (with a medicine typeahead) → approved prescription. |

## 🧱 Tech stack

- **Language / framework:** Python 3.13, FastAPI, Pydantic v2
- **Database:** PostgreSQL 16 + pgvector, SQLAlchemy 2 (async), Alembic migrations
- **AI:** OpenAI Whisper (transcription) + GPT-4o-mini (structured summary)
- **Auth:** Argon2 password hashing, PyJWT
- **Tooling:** uv (dependency management), Ruff (lint + format), pre-commit

## 🏛️ Architecture at a glance

```
Client ──HTTP──> FastAPI routes ──> services (business logic) ──> SQLAlchemy models ──> PostgreSQL (RLS)
                      │                                                                       ▲
                      │  audio upload                                                         │ tenant-scoped
                      ▼                                                                       │ by hospital_id
             Background task ──> OpenAI Whisper ──> OpenAI GPT ──> prescription draft ─────────┘
```

- **Thin routes → services → models.** Routes validate and delegate; services hold the logic.
- **Tenant isolation** is enforced in the database (RLS), not just in code. The app connects as a
  restricted role, and every query is automatically filtered to the current hospital.
- **The scribe runs in the background** (FastAPI `BackgroundTasks`) so the upload request returns
  instantly; the client polls the consultation for `processing_status`.

---

## ⚙️ Getting started (local)

### Prerequisites
- [Docker](https://www.docker.com/) (for PostgreSQL)
- [uv](https://docs.astral.sh/uv/) (Python package manager)

### 1. Start the database
```bash
docker compose up -d
```
> Postgres listens on host port **5433** (5432 is often taken by a native install). The
> `db/init` role/RLS bootstrap runs automatically on first start.

### 2. Configure environment
```bash
cd backend
cp .env.example .env
```
Then edit `backend/.env` and (optionally) add your OpenAI key for **real** AI:
```
OPENAI_API_KEY=sk-...
```
> Leave it blank and the scribe uses built-in **mock** transcript/summary — the whole flow still
> works end-to-end, just without live AI. Great for offline demos.

### 3. Install deps & run migrations
```bash
uv sync
uv run alembic upgrade head
```

### 4. Seed a demo hospital + admin
```bash
uv run python -m scripts.seed
```
Creates **Demo General Hospital** and admin `admin@demo.com` / `admin12345`.

### 5. Run the API
```bash
uv run uvicorn app.main:app --reload
```
Open the interactive Swagger docs: **http://127.0.0.1:8000/docs**

---

## 🎬 Demo

See **[docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)** for a step-by-step walkthrough that shows off
the AI scribe from login to an approved clinical note — designed to be run live in Swagger.

## 📚 More docs

- **[docs/PROJECT_GUIDE.md](docs/PROJECT_GUIDE.md)** — requirements, architecture decisions, and build log.
- **[docs/SETUP_PLAYBOOK.md](docs/SETUP_PLAYBOOK.md)** — reproducible setup commands and explanations.

## 🔐 A note on privacy

Patient audio is written to `backend/uploads/` and is **git-ignored** — recordings are never
committed. Recording consent is captured (with a timestamp) before any audio can be uploaded, and
audio upload is blocked without it.
