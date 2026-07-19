# Deployment Guide & Progress (Render)

> Living doc for taking the HMS live. Guide-mode: **the user runs all steps**; Claude explains.
> Created as a resume point so context can be compacted safely mid-deployment.

## Decisions (locked)
- **Host:** Render (PaaS). **Launch grade:** demo / portfolio. **Domain:** free `*.onrender.com`
  subdomains for now (real domain later).
- **Region:** Singapore (nearest to India) — DB and backend must be in the **same** region.
- **CI/CD split:**
  - **CI = GitHub Actions** (we write it): on PRs run lint + typecheck + build. **No automated
    tests for now** (user's explicit choice). This also unlocks the "require status checks"
    branch rule later.
  - **CD = Render's native GitHub auto-deploy** (built-in, no scripts): redeploys on merge to `main`.

## Architecture (3 Render services)
```
 Static Site  (root: frontend/, build: npm run build, publish: dist/)  → hms-web.onrender.com
 Web Service  (root: backend/, Docker)                                  → hms-api.onrender.com
 PostgreSQL   (managed, Singapore, PG16, Free)                          → internal to backend
```
- Frontend calls `/api/*`; a Render **static-site rewrite rule** proxies `/api/*` → backend URL,
  keeping it **same-origin (no CORS, no code change)**.

## Prep items still to do (flagged, not yet done)
1. **`backend/Dockerfile`** — needs writing (uv-based). Start cmd: `uv run uvicorn app.main:app
   --host 0.0.0.0 --port $PORT`. Run `uv run alembic upgrade head` as a pre-deploy/release step.
2. **Two DB roles for RLS** — our app uses `hms` (owner, migrations) + `hms_app` (restricted,
   runtime). Render gives ONE user (the owner). So after the DB is up we must **manually create
   the `hms_app` role** via psql (our `db/init/01-init-app-role.sql` does this locally; the RLS
   migration `GRANT ... TO hms_app` will FAIL if the role doesn't exist first).
3. **Env vars** to set on the backend service (in Render dashboard, never in git):
   - `MIGRATION_DATABASE_URL` = owner connection (for Alembic)
   - `DATABASE_URL` = `hms_app` connection (app runtime, RLS applies) — same host/db, different user
   - `JWT_SECRET_KEY` = a fresh random secret (generate: `python -c "import secrets;print(secrets.token_urlsafe(32))"`)
   - `OPENAI_API_KEY` = the real key
   - Note: pydantic-settings reads these case-insensitively from env.
4. **Seed once** after first migrate: `python -m scripts.seed` (creates Demo hospital + admin).
5. pgvector: installed locally but **no vector columns used yet** → `CREATE EXTENSION` not needed
   for the app to run today.

## Step tracker
- [x] Step 1 — Render account created (signed up; GitHub app install was **skipped**).
- [ ] **Step 2 — Create PostgreSQL** (`hms-db`, Singapore, PG16, Free). ← **IN PROGRESS**
- [ ] Step 2b — Create `hms_app` role via psql on the Render DB.
- [ ] Step 3 — Write `backend/Dockerfile`; create backend Web Service (root `backend/`, Docker,
      Singapore). Connect GitHub here → pick **"Only select repositories" → hospital-management-system**.
      Set env vars; ensure migrations run on deploy; seed once.
- [ ] Step 4 — Create frontend Static Site (root `frontend/`, build `npm run build`, publish
      `dist/`); add rewrite rule `/api/* → https://<backend>.onrender.com/api/:splat`.
- [ ] Step 5 — Write GitHub Actions CI workflow (`.github/workflows/ci.yml`): lint + typecheck +
      build for backend (ruff) and frontend (eslint, tsc, vite build). Then enable branch
      "require status checks".
- [ ] Step 6 — Verify end-to-end on the live URL; optionally add render.yaml Blueprint (IaC).

## Reminders / context
- Git identity currently **Mahesh Kumar** (backend/deploy phase). Frontend UI work was authored by
  **Sairoja** (wife) in earlier merged PRs.
- Node pinned to 22.20.0 via `frontend/.nvmrc`; use `nvm use 22.20.0` for frontend commands.
- Local demo logins: admin@demo.com/admin12345, dr.demo@demo.com/doctor12345,
  reception@demo.com/reception123.
- `main` is branch-protected (no force-push / no deletion). Secrets go in the Render dashboard,
  never pasted to Claude or committed.
