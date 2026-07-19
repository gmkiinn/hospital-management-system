# syntax=docker/dockerfile:1

# Production image for the HMS FastAPI backend, built with uv.
# Database migrations run as a Render *pre-deploy* step (`alembic upgrade head`),
# not here — this image's only job is to serve the API.
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim

# uv tuning:
#   COMPILE_BYTECODE — precompile .pyc for faster cold starts
#   LINK_MODE=copy   — copy from the uv cache (no hardlink warnings across layers)
#   PROJECT_ENVIRONMENT — put the venv at a known path we can add to PATH
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/.venv \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# 1) Install dependencies first, in their own layer — cached until the lockfile
#    changes, so code edits don't reinstall the world. --no-install-project
#    (this project ships no build backend) and --no-dev (skip ruff/pytest/etc).
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

# 2) Copy the application source (see .dockerignore for what's excluded).
COPY . .

# On boot: apply migrations (owner role), seed once (idempotent), then start the
# API. Render's free tier has no pre-deploy/shell, so this is where schema + seed
# happen; both are no-ops after the first successful run.
#   `sh -c` expands $PORT; `exec` replaces the shell with uvicorn so it becomes
#   PID 1 and receives SIGTERM directly (clean, fast shutdowns). The venv is on
#   PATH, so alembic/python/uvicorn are called directly (no `uv run`).
CMD ["sh", "-c", "alembic upgrade head && python -m scripts.seed && exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
