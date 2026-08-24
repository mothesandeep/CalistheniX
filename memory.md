# CalistheniX — Project Memory & Architecture Context

## 1. Project Identity & Purpose

**CalistheniX** is a local-first, aesthetic calisthenics progression tracker and live workout runner specifically built for bodyweight skill work and progressive overload. Unlike traditional lifting apps that model only `weight × reps`, CalistheniX natively tracks isometric hold duration, movement tempo (e.g., `3010`), rest intervals, superset pairings, multi-tier routine levels, live active workout sessions, all-time personal records (PRs), and training consistency heatmaps.

---

## 2. Core Architecture & Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                 Frontend — Pure Web Platform                 │
│  - Vanilla HTML5 / CSS3 / ES6+ JavaScript (Zero bundle step)│
│  - Chart.js for data visualization                          │
│  - Web Audio API (synthetic oscillators) + Vibration API    │
│  - PWA Service Worker (sw.js) for full offline caching      │
│  - Local-first optimistic persistence (localStorage)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP JSON REST
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Backend — Flask REST API                     │
│  - Python 3.10+ / Flask / Flask-CORS (Port 5001)            │
│  - SQLite3 database (backend/tracker.db) with FK enforcement│
│  - Idempotent log creation via client UUID deduplication    │
└─────────────────────────────────────────────────────────────┘
```

- **Frontend Server**: Python HTTP server on port `8000` (`python3 -m http.server 8000 --directory frontend`).
- **Backend API**: Python Flask on port `5001` (`python3 backend/app.py`).
- **Database**: SQLite at `backend/tracker.db`.

---

## 3. Key Invariants & Design Principles

1. **Local-First & Offline Resilience**:
   - Every log action is written to `localStorage` immediately (`cx_pending_<uuid>`).
   - UI shows instant success checkmarks without waiting for backend network roundtrips.
   - Background sync loop pushes pending logs to `POST /logs` with `client_uuid` for idempotent deduplication.
2. **Gym-Usable Ergonomics**:
   - One-handed operation, massive tap targets (minimum 44×44px).
   - High-contrast dark theme (`#0a0a0f` background, `#12121a` surface, `#7c5cfc` accent).
   - Monospace typography (`JetBrains Mono`) for numbers, timers, and tabular metrics.
   - Tactile feedback: Synthetic Web Audio beeps + Vibration API haptic pulses for hold save, rest tick, and rest end.
3. **No Unnecessary Dependencies**:
   - Pure vanilla JavaScript and CSS without complex build pipelines (no Node build step required).
   - No external sound files; all cues are generated procedurally via the browser's Web Audio API.

---

## 4. Database Schema Reference

### `exercises`
Catalog of calisthenics exercises and progression chain links.
- `id` (INTEGER PK), `name` (TEXT), `day` (TEXT), `type` (`reps` | `duration`), `prerequisite_id` (FK), `next_id` (FK).
- Progression thresholds: `progression_target_reps`, `progression_target_duration`, `progression_sessions_needed` (default 2).

### `logs`
Recorded workout sets.
- `id` (INTEGER PK), `exercise_id` (FK), `timestamp` (DATETIME), `reps` (INTEGER), `weight_kg` (REAL), `duration_sec` (INTEGER), `rpe` (INTEGER), `client_uuid` (TEXT UNIQUE).

### `routine_levels`
Routine level tiers (e.g. `Push A`, Level 1–5).
- `id` (INTEGER PK), `routine_name` (TEXT), `level` (INTEGER), `UNIQUE(routine_name, level)`.

### `level_exercises`
Ordered exercise configuration per routine level.
- `id` (INTEGER PK), `routine_level_id` (FK), `exercise_id` (FK), `order_index` (INTEGER), `sets` (INTEGER), `reps` (INTEGER), `duration_sec` (INTEGER), `tempo` (TEXT), `rest_sec` (INTEGER), `superset_group` (INTEGER), `notes` (TEXT).

---

## 5. Development Milestones & Status

| Milestone | Scope | Status | Release Tag |
|:---|:---|:---|:---|
| **Phase 0** | Schema, seed data, initial shell | ✅ Complete | `v1.0.0` |
| **Phase 1** | Core logging, hold timer, Chart.js history, JSON backup export, offline sync | ✅ Complete | `v1.1` |
| **Phase 2** | Multi-level routines, supersets, rolling 7-day PPL A/B split, dashboard, sensory cues, PWA | ✅ Complete | `v1.2` |
| **Phase 3** | Active workout execution runner, live target vs. actual reps tracking, auto progression | ✅ Complete | `v1.3` |
| **Phase 4** | Database snapshot import/restore, PRs hub, and 4-week training consistency heatmap | ✅ Complete | `v1.4` |

---

## 6. Notable Implementation Decisions & History

- **Skill Tree Refinement**: The complex SVG skill tree was removed in favor of clean Routine & Level management and an automated backend progression readiness engine (`/exercises/:id/progression-status`).
- **Rolling Split Anchor**: The 7-day rolling cycle (`Push A` → `Pull A` → `Legs A` → `Push B` → `Pull B` → `Legs B` → `Rest`) is calculated from `cx_cycle_start` in `localStorage`.
- **Idempotency Guarantee**: Submitting the same `client_uuid` multiple times returns HTTP 201 with the existing record, avoiding duplicate log rows during spotty network conditions.
- **Database Location Robustness**: `DB_PATH` is anchored to `os.path.dirname(os.path.abspath(__file__))` to guarantee connection to `backend/tracker.db` regardless of execution cwd.
