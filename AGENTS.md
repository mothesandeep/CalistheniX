# CalistheniX

Calisthenics skill-progression tracker. Offline-first, no build tooling, no frontend framework.

# Technology Stack
- **Backend**: Python + Flask, SQLite (no ORM assumed unless you've added one — check `backend/` before assuming)
- **Frontend**: Vanilla JS, HTML, CSS — no React/Vue, no bundler
- **Data**: Offline-first — data lives in `localStorage` on the client and syncs to SQLite via the Flask API
- **Charts**: Chart.js for progression visualizations
- **Design system**: Deep charcoal-black base, phase-based duotone accents — amber (warm-up/prep), coral-red (train), teal (cool-down/recover). Keep this consistent across every screen; don't reintroduce the old single lime-green (#C6FF3D) accent.

# Project Structure
- `backend/` – Flask app: routes, SQLite access, sync endpoints, test suites
- `frontend/` – Vanilla JS/HTML/CSS client, offline-first with localStorage
- `PRD.md` – Product requirements and anti-scope-creep guardrails — read before adding any new feature
- `architecture.md` – System architecture reference
- `design.md` – Design system spec (colors, phase accents, typography)
- `phases.md` – Phased build sequence (Phases 0–16) — check current phase before building ahead of it
- `appflow.md` – Application navigation and UI screen flow reference
- `memory.md` – Project history and engineering decisions log
- `run.py` – Root application runner

# Environment Setup
```bash
# Create virtual environment from project root
python3 -m venv venv && source venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Launch Backend API (Port 5001)
python3 run.py

# Launch Frontend (Port 8080)
python3 -m http.server 8080 --directory frontend
```
Frontend has no build step — open `frontend/index.html` directly or serve statically alongside the Flask app.

# Commands
- **Full Test Suite (pytest)**: `PYTHONPATH=. ./venv/bin/pytest backend/tests`
- **Full Test Suite (unittest)**: `PYTHONPATH=. ./venv/bin/python -m unittest discover -s backend/tests`
- **Single Test Module**: `PYTHONPATH=. ./venv/bin/pytest backend/tests/test_api.py`

# Code Style
- Python: PEP 8, keep Flask routes thin — push logic into helper functions/modules, not inline in route handlers
- JS: vanilla, no framework syntax (no JSX, no framework-specific hooks) — plain DOM APIs and `localStorage`
- Never hardcode secrets, API keys, or absolute file paths
- Match existing naming and file organization in `backend/` and `frontend/` rather than introducing new patterns

# Design Guardrails
- Follow `design.md` for the phase-accent system (amber/coral-red/teal) — don't invent new accent colors for new screens
- Offline-first is a hard constraint: any new feature must work with localStorage first, syncing to SQLite second — don't build features that require the server to be reachable to function

# Scope Discipline
- `PRD.md` has explicit anti-scope-creep guardrails — before adding a feature not in the PRD, flag it rather than silently building it
- `phases.md` defines the build order (Phases 0–16) — don't jump ahead to a later phase's features without checking current progress first

# Permissions

## Allowed without prompting
- Read any file in the repo
- Add/edit code within the current phase's scope (per `phases.md`)
- Fix obvious bugs, linting issues, formatting

## Ask first
- Adding new dependencies (backend or frontend)
- Changing the SQLite schema
- Deviating from `design.md`'s accent/color system
- Adding features not listed in `PRD.md`
- Git operations that rewrite history, or pushing to `main`

# Boundaries
- 🚫 Never commit secrets, API keys, or `.env` files
- 🚫 Never reintroduce the old lime-green (#C6FF3D) single-accent design
- 🚫 Never build a feature that breaks offline-first behavior
- ⚠️ Ask before restructuring `backend/` or `frontend/` folders
