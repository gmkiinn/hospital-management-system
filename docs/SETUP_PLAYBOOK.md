# Project Setup Playbook — Monorepo (FastAPI + React)

> A reproducible, top-to-bottom guide to bootstrapping a production-grade
> monorepo with a **FastAPI backend** and a **React + Vite frontend**, including
> code quality tooling and git hooks. Every command and file we used is here so
> you can repeat this setup on any new project.
>
> **Conventions used throughout:** monorepo (`backend/` + `frontend/`),
> Conventional Commits, atomic commits, feature branches + PRs (after the initial
> foundation), one hook manager (`pre-commit`) for the whole repo.

---

## Quick reference — what each piece does

A one-line-per-item recap of everything in this playbook. The detailed sections
follow below.

**Git & repo**
- `git config user.name/email` — stamps your identity on commits.
- `gh auth login` — authenticates you to GitHub for push/pull.
- `git clone` — pulls the repo down and wires up the `origin` remote.
- `mkdir backend frontend` — the monorepo split (one repo, two apps).

**Backend (Python / FastAPI)**
- `uv init --app` — creates `pyproject.toml` (dependency manifest) + pins Python 3.13.
- `uv add …` / `uv add --dev …` — runtime deps vs dev-only tools; produces
  `uv.lock` for reproducible installs.
- `config.py` — reads settings from env vars, typed and validated (no hardcoded config).
- `health.py` — a modular router with one endpoint (`/health`).
- `main.py` — creates the FastAPI app and mounts routers under `/api/v1`.
- `uv run uvicorn app.main:app --reload` — runs the dev server.
- ruff config + `uv run ruff check/format` — auto-lint and auto-format.

**Pre-commit (repo-wide)**
- `.pre-commit-config.yaml` — defines hooks: whitespace/newline/yaml/large-file
  checks, ruff for backend, prettier + eslint for frontend.
- `pre-commit install` — makes those hooks run automatically on every `git commit`.

**Frontend (React / Vite / TS)**
- `npm create vite@latest` — scaffolds React + TypeScript; pin **Vite 7** to dodge
  the rolldown/npm bug.
- `npm install` — downloads deps, creates `package-lock.json` (lockfile).
- Tailwind (`@tailwindcss/vite` plugin + `@import "tailwindcss"`) — utility-class
  styling, no config file.
- Prettier + `eslint-config-prettier` — Prettier formats, ESLint checks quality,
  config-prettier stops them clashing.
- `npm run format` / `npm run lint` — format and lint scripts.

**The pattern behind it all:** reproducible installs (lockfiles), config from env
vars, code split into small modules, and quality auto-enforced on every commit —
the baseline a real team sets up before writing features.

---

## 0. Prerequisites (install once per machine)

```bash
# git identity (commits are attributed to this)
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# GitHub CLI — handles auth for push/pull
brew install gh            # macOS (Homebrew)
gh auth login              # browser-based login, sets up credentials

# Backend toolchain
brew install uv            # Python dependency/venv manager (or: curl -LsSf https://astral.sh/uv/install.sh | sh)

# Frontend toolchain
node --version             # need Node 20+ (nvm or brew install node)

# Repo-wide git hook manager
uv tool install pre-commit
```

Verify:
```bash
git config --global user.name && git config --global user.email
gh --version
uv --version
node --version && npm --version
pre-commit --version
```

---

## 1. Create & clone the repo

1. On `github.com/new`: name it, set **Private**, **Add a README**,
   **.gitignore = Python**, no license. (Initializing with a README lets you
   `git clone` immediately.)
2. Clone and enter it:
   ```bash
   git clone https://github.com/<you>/<repo>.git
   cd <repo>
   ```

**Gotcha:** git does not track empty folders — every directory needs at least one
tracked file inside it.

---

## 2. Monorepo skeleton

```bash
mkdir backend frontend
```

Append a Node section to the root `.gitignore` (the Python template is already
there from repo creation):
```gitignore
# Node / frontend
node_modules/
frontend/dist/
frontend/build/
.env
.env.local
```

---

## 3. Backend foundation (FastAPI + uv)

### 3.1 Initialize and add dependencies
```bash
cd backend
uv init --app --name hms-backend     # creates pyproject.toml, .python-version, main.py placeholder
rm main.py                           # remove throwaway placeholder

# runtime deps
uv add fastapi "uvicorn[standard]" pydantic-settings

# dev-only deps (linting, testing, hooks)
uv add --dev ruff pytest pytest-asyncio httpx pre-commit
```
**Why `uv`:** it's a single fast tool that manages the virtual environment, the
dependencies, *and* the lockfile — replacing the older `python -m venv` +
`pip` + `requirements.txt` combo. `uv init --app` marks this as a deployable
application (not a library) and pins the Python version in `.python-version`.

**Runtime vs. dev split:** `uv add` records *runtime* dependencies (needed to run
the app in production); `uv add --dev` records *development-only* tools (linters,
test runners, hooks) in a separate group that won't ship to production. Keeping
them apart keeps your production image small and its dependency surface minimal.

- `fastapi` — the web framework. `uvicorn[standard]` — the ASGI server that runs it
  (`[standard]` adds websockets/uvloop for performance). `pydantic-settings` — loads
  typed config from environment variables.
- `ruff` — linter + formatter. `pytest` (+ `pytest-asyncio`) — test runner with
  async support. `httpx` — async HTTP client FastAPI's test client uses. `pre-commit`
  — the git-hook framework (Section 4).
- `uv.lock` (**commit it**) pins the exact version of every package and sub-package,
  so everyone installs byte-identical dependencies.
- `.venv/` (**gitignored**) is the actual virtual environment on your machine.
- To reproduce this environment on another machine: `uv sync` reads `uv.lock` and
  recreates `.venv/` exactly.

### 3.2 Package structure
```bash
mkdir -p app/core app/api/routes tests
touch app/__init__.py app/core/__init__.py app/api/__init__.py app/api/routes/__init__.py tests/__init__.py
touch app/main.py app/core/config.py app/api/routes/health.py
```

Resulting layout:
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # creates FastAPI app, wires routers
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py        # typed settings from env vars
│   └── api/
│       ├── __init__.py
│       └── routes/
│           ├── __init__.py
│           └── health.py    # first endpoint
├── tests/__init__.py
├── pyproject.toml
├── uv.lock
└── .python-version
```
**Why this structure:** `app/` is the importable package; the empty `__init__.py`
files are what make each folder a Python package so imports like
`from app.core.config import settings` resolve. `core/` holds cross-cutting concerns
(config now; later security, DB session); `api/routes/` holds one file per feature's
endpoints; `tests/` mirrors the app. `main.py` stays thin and only *assembles*
routers — endpoint logic never lives there. This is the modular-monolith idea applied
to the folder layout: each feature is a self-contained module that `main.py` wires in.

### 3.3 `app/core/config.py` — typed settings
```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Application
    app_name: str = "HMS Backend"
    environment: str = "development"
    debug: bool = True
    api_v1_prefix: str = "/api/v1"


settings = Settings()
```
Config comes from env vars (never hardcoded). Fields are typed → invalid values
fail loudly at startup. `settings` is imported everywhere as a singleton.

### 3.4 `app/api/routes/health.py` — modular router
```python
from fastapi import APIRouter

router = APIRouter()


@router.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
```
Each feature gets its own `APIRouter`; `main.py` includes them all.

### 3.5 `app/main.py` — thin assembly point
```python
from fastapi import FastAPI

from app.api.routes import health
from app.core.config import settings

app = FastAPI(
    title=settings.app_name,
    debug=settings.debug,
)

app.include_router(health.router, prefix=settings.api_v1_prefix)
```

### 3.6 Run & verify
```bash
uv run uvicorn app.main:app --reload
```
- Endpoint: `http://127.0.0.1:8000/api/v1/health` → `{"status":"ok"}`
- Auto docs: `http://127.0.0.1:8000/docs` (Swagger UI, free from FastAPI)

### 3.7 Ruff (lint + format) — append to `backend/pyproject.toml`
```toml
[tool.ruff]
line-length = 88
target-version = "py313"

[tool.ruff.lint]
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # pyflakes (unused imports/vars, undefined names)
    "I",   # isort (import sorting)
    "B",   # flake8-bugbear (likely bugs)
    "C4",  # flake8-comprehensions
    "UP",  # pyupgrade (modernize syntax)
]
ignore = []

[tool.ruff.format]
quote-style = "double"
indent-style = "space"
```
Run:
```bash
uv run ruff check .      # lint (add --fix to auto-fix)
uv run ruff format .     # format
```

---

## 4. Repo-wide pre-commit hooks

**What is pre-commit?** It's a framework that runs a list of checks ("hooks")
automatically every time you run `git commit`, *before* the commit is created. If
any hook fails or modifies a file, the commit is stopped. This means broken
formatting, lint errors, leftover merge-conflict markers, or accidentally-staged
huge files can't enter the repo in the first place — you catch them locally
instead of in code review or CI.

**How it works under the hood:**
- Each hook comes from a git repo pinned to a specific version (`rev:`). pre-commit
  clones that repo once and builds an **isolated environment** for it, cached
  locally. So the exact hook version is identical for you, your teammate, and CI —
  reproducibility, same as lockfiles give you for dependencies.
- Hooks only run against the files you actually **staged** for that commit (not the
  whole repo), so commits stay fast.
- A hook can either *check* (pass/fail) or *fix* (modify the file). When a hook
  modifies a file, pre-commit reports "Failed" on purpose and aborts — so you can
  review the change and re-stage it. That's a feature, not an error.

**Why the config lives at the repo root:** git hooks are installed into `.git/hooks/`,
and a repo has exactly one `.git` (at the root). So in a monorepo there is one
`.pre-commit-config.yaml` at the root that covers both `backend/` and `frontend/`;
you scope individual hooks to a folder with `files:`. Using one hook manager for
the whole repo is deliberate — mixing pre-commit with a JS-world manager like husky
would have two tools fighting over `.git/hooks`.

Create `.pre-commit-config.yaml` at the **repo root**:

```yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v6.0.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files
      - id: check-merge-conflict

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.15.21
    hooks:
      - id: ruff
        name: ruff lint
        args: [--fix]
        files: ^backend/
      - id: ruff-format
        name: ruff format
        files: ^backend/

  - repo: local
    hooks:
      - id: frontend-prettier
        name: frontend prettier (check)
        entry: bash -c 'cd frontend && npm run format:check'
        language: system
        files: ^frontend/
        pass_filenames: false
      - id: frontend-eslint
        name: frontend eslint
        entry: bash -c 'cd frontend && npm run lint'
        language: system
        files: ^frontend/
        pass_filenames: false
```

**What each hook in this config does:**

- **`pre-commit-hooks` (the generic bundle)** — small, language-agnostic safety checks:
  - `trailing-whitespace` — strips trailing spaces at line ends (noisy in diffs).
  - `end-of-file-fixer` — ensures every file ends with exactly one newline (a POSIX
    convention many tools rely on). *This is the hook that most often aborts a commit
    on a freshly-created file — see the gotcha in Section 6.*
  - `check-yaml` — parses YAML files and fails if one is invalid (catches broken config).
  - `check-added-large-files` — blocks accidentally committing a large file (default
    >500 KB), e.g. a stray build artifact, audio dump, or `node_modules` slip.
  - `check-merge-conflict` — fails if a file still contains `<<<<<<<` / `>>>>>>>`
    conflict markers.
- **`ruff-pre-commit` (backend)** — runs your Python linter/formatter as hooks:
  - `ruff` with `args: [--fix]` — lints and auto-fixes safe issues (unused imports,
    import order).
  - `ruff-format` — applies formatting.
  - Both are scoped with `files: ^backend/` so they never touch frontend code.
- **`local` hooks (frontend)** — hooks defined inline in this file instead of pulled
  from a remote repo. Field-by-field:
  - `entry` — the command to run; here it `cd`s into `frontend/` so ESLint/Prettier
    find their config, then runs the npm script.
  - `language: system` — run with tools already on the machine (node/npm), not an
    isolated env pre-commit builds.
  - `files: ^frontend/` — only trigger when a staged file is under `frontend/`.
  - `pass_filenames: false` — don't append individual filenames to the command; the
    npm scripts already target the whole frontend folder.

**Install & test (from repo root):**
```bash
pre-commit install            # writes the git hook into .git/hooks/pre-commit so it runs on every commit
pre-commit autoupdate         # bumps each rev: to the latest release and writes it back into the config
pre-commit run --all-files    # one-time manual run against all currently-tracked files (normally hooks only run on staged files)
```
- Hooks that **modify** a file report "Failed" (by design) — re-`git add` the fixed
  file and commit again.
- `pre-commit run --all-files` only sees files git already **tracks**; brand-new
  untracked files aren't checked until you `git add` them (which is why a fresh
  frontend/ shows "no files to check" until its first commit).

---

## 5. Frontend foundation (React + Vite + TypeScript)

### 5.1 Scaffold
```bash
cd frontend
npm create vite@latest . -- --template react-ts
```
**What this does:** `npm create vite@latest` runs Vite's project scaffolder. The `.`
scaffolds into the current (empty) `frontend/` folder instead of a new subfolder;
everything after `--` is passed to the scaffolder, and `--template react-ts` selects
the React + TypeScript starter. Vite is the build tool + dev server for the SPA (it
replaced the deprecated Create React App). It writes `package.json` but does *not*
install packages — that's the next step.

### 5.2 IMPORTANT — pin Vite 7 (avoid the rolldown/npm bug)
The latest `create-vite` pulls **Vite 8** (rolldown bundler), which trips npm's
optional-dependency bug: `Cannot find native binding ... @rolldown/binding-*`.
Fix by pinning stable Vite 7 in `package.json`:
```jsonc
// package.json — devDependencies
"@vitejs/plugin-react": "^5.2.0",   // was ^6.x (requires Vite 8)
"vite": "^7.3.6"                    // was ^8.x
```
Then:
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev        # → Local: http://localhost:5173/
```
`package-lock.json` (commit it) is the frontend lockfile; `node_modules/` is gitignored.

### 5.3 Tailwind CSS v4 (Vite plugin — no config file)
Tailwind is a utility-class CSS framework: you style with classes like `flex`,
`min-h-screen`, `text-3xl` directly in JSX instead of writing separate CSS. **v4 is
much simpler than older versions** — it runs as a Vite plugin, so there's no
`tailwind.config.js`, no PostCSS config, and no `npx tailwind init`. The plugin scans
your files and generates only the CSS for the classes you actually use.
```bash
npm install tailwindcss @tailwindcss/vite
```
Register the plugin in `vite.config.ts` (order: React plugin, then Tailwind):
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```
Replace all of `src/index.css` with:
```css
@import "tailwindcss";
```

### 5.4 Remove Vite starter boilerplate
```bash
rm src/App.css
rm -rf src/assets
rm public/icons.svg public/favicon.svg
```
Edit `index.html`: delete the `<link rel="icon" ...>` line and set
`<title>Hospital Management System</title>`.

Minimal `src/App.tsx` (replace contents):
```tsx
function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <h1 className="text-3xl font-semibold text-slate-800">
        HMS Frontend — Tailwind is working
      </h1>
    </div>
  )
}

export default App
```

### 5.5 Prettier + ESLint (separate jobs, no conflict)
ESLint (from the Vite template) = code quality. Prettier = formatting.
`eslint-config-prettier` disables ESLint rules that overlap with Prettier.
```bash
npm install -D prettier eslint-config-prettier
```
`eslint.config.js` — add the import and put it **last** in `extends`:
```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import eslintConfigPrettier from 'eslint-config-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      eslintConfigPrettier,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
])
```
`.prettierrc.json`:
```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 80,
  "tabWidth": 2
}
```
`.prettierignore`:
```
dist
node_modules
package-lock.json
```
Add to `package.json` `"scripts"`:
```json
"format": "prettier --write .",
"format:check": "prettier --check ."
```
Run:
```bash
npm run format
npm run lint
```
The frontend `local` hooks in the root `.pre-commit-config.yaml` (Section 4)
run `format:check` and `lint` automatically on commit.

---

## 6. Git workflow & conventions

- **Conventional Commits**: `type(scope): summary` — `feat`, `fix`, `chore`,
  `docs`, `test`, `refactor`, `ci`. Examples used:
  - `chore(backend): set up project foundation with uv, deps, and package structure`
  - `feat(backend): add config, app assembly, and health endpoint`
  - `chore(frontend): scaffold React + Vite + TS with Tailwind, ESLint, Prettier`
- **Atomic commits**: one coherent change per commit. Stage specific paths
  (`git add <path>`) instead of blanket `git add .`; use
  `git restore --staged <path>` to pull a file back out.
- **Branches**: initial foundation went to `main`; real feature work uses
  `feature/<name>` → PR → review → merge.

### Common gotcha — pre-commit aborts on newline fixes
`end-of-file-fixer` fixes files missing a trailing newline, which **aborts** the
commit ("files were modified by this hook"). Recovery:
```bash
git add <the-fixed-file>      # re-stage the hook's fix
git commit -m "..."           # commit again
```
**Prevent it** — make your editor match the hooks. VS Code `settings.json`:
```json
"files.insertFinalNewline": true,
"files.trimTrailingWhitespace": true
```

---

## 7. Final verification checklist

- [ ] `uv run uvicorn app.main:app --reload` → `/api/v1/health` returns `{"status":"ok"}`
- [ ] `uv run ruff check .` → all checks pass
- [ ] `npm run dev` → Vite serves at `:5173`, Tailwind classes apply
- [ ] `npm run lint` and `npm run format:check` pass
- [ ] `pre-commit run --all-files` → all hooks pass
- [ ] `git status` clean, branch synced with `origin/main`
