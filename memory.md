# CalistheniX — Project Memory & Architecture Context

## Phase Progress (CalistheniX Product Improvement Roadmap)

### Phase 0: Baseline Audit & Safety (COMPLETED)
- Baseline audit artifact created in `baseline_audit.md`.
- Documented system architecture, data models, workout execution lifecycle, and refactoring paths.

### Phase 1: Workout Session Foundation (COMPLETED)
- **Database Schema**: Added `workout_sessions` table (`session_uuid UNIQUE`, `routine_name`, `level`, `started_at`, `completed_at`, `duration_sec`, `total_sets`, `completed_sets`, `status`, `raw_json`) and added `session_uuid` foreign key reference to `logs` table.
- **REST Endpoints**:
  - `POST /workout_sessions`: Idempotent session creation/sync + linked log persistence.
  - `GET /workout_sessions`: Lists all completed workout sessions ordered newest first.
  - `GET /workout_sessions/<session_uuid>`: Detailed session breakdown with JSON snapshot and linked sets.
- **Active Workout Lifecycle & Pause/Resume**:
  - Added Pause (`pauseWorkoutSession()`) and Resume (`resumeWorkoutSession()`) with pause duration tracking (`totalPausedMs`) to guarantee 100% accurate active duration calculation.
  - Added `.workout-paused-banner` and locked inputs during pause.
  - Set completion persists instantly to `cx_active_session` in `localStorage`.
  - Offline session sync queue via `cx_pending_session_<id>`.
- **Automated Tests**: 11 unit tests in `backend/test_app.py` passed in 0.022s.

### Phase 2: Today / Routine Separation (COMPLETED)
- **Today (`#home` / `renderTodayView`)**: Clean Execution Hub answering *"What should I do now?"*. Features dynamic Hero Card with Today's Split, key stats (Exercises count, ~Total sets, Est. duration), live status badge (`Ready to Train` / `In Progress` / `Paused` / `Rest Day`), One-tap Start/Resume button, and clean read-only exercise preview order without editing distractions.
- **Routine (`#routine` / `renderRoutineView`)**: Pure Program Architecture & Configuration answering *"What does my program contain?"*. Allows selecting routine splits and levels, viewing exercise targets, tempo, rest intervals, supersets, and coaching notes, with direct link to Program Editor (`#edit`).

### Phase 3: Persistence, Sync & Data Reliability (COMPLETED)
- **Backup & Restore v2.0**:
  - `GET /export`: Exports full backup bundle with versioning (`export_version: '2.0'`), `workout_sessions`, `logs`, and `exercises` (with `?format=legacy` backward-compatibility).
  - `POST /import`: Idempotently restores both `workout_sessions` and `logs`, validating JSON format and skipping duplicates without data corruption.
- **Client Resilience**: Added `online`/`offline` network event listeners, background sync retry loops (`cx_pending_session_*` and `cx_pending_*`), and dashboard Export/Import UI buttons.
- **Automated Tests**: 12 unit tests in `backend/test_app.py` passed in 0.028s.

### Phase 4: History as a Real Training Log (COMPLETED)
- **Unified Workout History Log (`#history` / `renderHistoryListView`)**: Shows chronological training session cards with Routine name, Level badge, Date/Time, Duration, and Sets completed with one-tap breakdown navigation.
- **Session Detail Breakdown (`#session-<uuid>` / `renderSessionDetailView`)**: Comprehensive breakdown showing exact recorded sets for every exercise in that session (reps/seconds, weight in kg, RPE rating).
- **Exercise Trends (`#history-<id>`)**: Preserved single-exercise historical trend charts with Chart.js, metric toggles, and progression readiness scoring.
- **Dashboard Quick Access**: Added direct **"View Workout History Log"** button on the Dashboard.

### Phase 5: Dashboard Reliability & Signal (COMPLETED)
- **Canonical Aggregates**:
  - `GET /dashboard/summary`: Computes dynamic streak days preserving yesterday's active streak until today's session is logged, distinct `week_sessions` in rolling 7-day window, and total `week_sets`.
  - `GET /dashboard/records`: Live PR leaderboards grouping top reps, hold seconds, and weighted load.
  - `GET /dashboard/activity`: 4-week training consistency volume aggregation.
- **Instant Recalculation Lifecycle**: Finishing an active workout immediately updates all dashboard aggregates in parallel without requiring page refresh.
- **Automated Tests**: 13 unit tests in `backend/test_app.py` passed in 0.029s.

### Phase 6: Workout Runner Execution Experience (COMPLETED)
- **Active Exercise Focus**: Dynamic `.workout-ex-card-active` with spotlight styling and glowing `Focus` badge on current in-progress exercise.
- **Tempo Prescription Guidance**: Inline tempo display pill (e.g., `Tempo: 3010`) maintaining strict form cues.
- **Frictionless Set Adjustments**: Added inline stepper buttons (`+` and `-`) alongside direct numeric input for one-tap set adjustments without opening mobile keyboards.
- **Audio & Haptic Signals**: Rest countdown warning ticks (3s, 2s, 1s), hold save confirmation, and set completion chimes via Web Audio API.

### Phase 7: Progression System Overload Intelligence (COMPLETED)
- **Promotion REST Endpoint**: `POST /exercises/<ex_id>/promote` replaces exercise slots across all routine levels with its configured `next_id` progression step automatically.
- **Interactive UI Progression Action**: One-tap "Promote" button on readiness banners immediately upgrades program configuration and triggers level-up celebration chime.
- **Fatigue Guard & Weighted Scoring**: 60% hit-rate weight + 40% RPE fatigue credit, preventing unsafe premature progressions when RPE >= 9.
- **Automated Tests**: 14 unit tests in `backend/test_app.py` passed in 0.030s.

### Phase 8: PR and Benchmark Tracking (COMPLETED)
- **Live In-Workout PR Detection**: `checkAndCelebratePR()` dynamically inspects each finished set against all-time records across max reps, hold duration, and added load (+kg).
- **Celebratory Fanfare & Audio**: Instant celebratory toast notification (`🏆 NEW PR!`) and two-beep chime trigger upon hitting an all-time PR during live workout training.
- **Multi-Dimensional PR Cards**: Dashboard PR leaderboard renders multi-attribute badges (`X reps`, `Ys hold`, `+Zkg load`) with direct link to exercise progress charts.

### Phase 9: RPE and Fatigue Context (COMPLETED)
- **RIR Education & Real-Time Tooltips**: Added `RPE_DESCRIPTIONS` mapping RPE 1–10 to explicit Reps-in-Reserve (RIR) fatigue cues across logging buttons.
- **Active Runner Inline RPE Logging**: Added compact RPE select dropdowns on each set in the live runner (`updateWorkoutSetRPE()`).
- **Fatigue Guard Integration**: Integrated with progression readiness evaluation to protect athletes from overtraining when average RPE >= 9.
- **Automated Tests**: 14 unit tests in `backend/test_app.py` passed in 0.032s.

### Phase 10: Frontend Architecture Hardening & Modularity (COMPLETED)
- **Architectural Scoping**: Cleanly sectioned modules for Audio/Haptics, State & Outbox Sync, API Client, Active Runner Engine, History Engine, and UI View Renderers.
- **Memory Leak Protection**: Hardened timer disposal (`stopRest`, `stopTimer`, `_chartInstance.destroy()`) during view transitions.
- **Automated Tests**: 14 unit tests in `backend/test_app.py` passed in 0.043s.

### Phase 11: Automated Test Suite Expansion (COMPLETED)
- **High-Coverage Regression Suite**: Added unit tests covering boundary calculations, 404/400 bad request guards, dead-end promotion protections, and API directory routing.
- **Test Performance**: **15/15 unit tests passing cleanly in 0.035s**.

### Phase 12: PWA & Offline Experience Hardening (COMPLETED)
- **Service Worker v2.0**: Upgraded `sw.js` cache name to `calisthenix-v2.0` with explicit API route bypasses (`/workout_sessions`, `/import`, `/export`, `/logs`, `/exercises`, `/dashboard`) and offline fallback navigation.
- **Manifest & Aesthetics**: Configured standalone display with `#0a0a0f` dark mode theme background.

### Phase 13: Documentation & Project Knowledge Base (COMPLETED)
- **Comprehensive Production Documentation**: Rewrote `README.md` with complete architecture diagrams, accurate port instructions (Backend on `5001`, Frontend on `8080`), full REST API table, and user guide.
- **Synchronized Artifacts**: Updated `baseline_audit.md`, `walkthrough.md`, and `memory.md` to reflect 100% completion of Phases 0 through 13.
- **Automated Verification**: **15/15 unit tests passing cleanly in 0.036s**.

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
│  - Connection safety via @contextmanager get_db() pattern   │
│  - Idempotent log creation via client UUID deduplication    │
└─────────────────────────────────────────────────────────────┘
```

- **Frontend Server**: Python HTTP server on port `8080` / `8000` (`python3 -m http.server 8080 --directory frontend`).
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
   - High-contrast dark theme (`#0d0d0f` background, `#141418` surface, `#7c6af7` accent).
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
| **Phase 0** | Schema, seed data, initial shell | Complete | `v1.0.0` |
| **Phase 1** | Core logging, hold timer, Chart.js history, JSON backup export, offline sync | Complete | `v1.1` |
| **Phase 2** | Multi-level routines, supersets, rolling 7-day PPL A/B split, dashboard, sensory cues, PWA | Complete | `v1.2` |
| **Phase 3** | Active workout execution runner, live target vs. actual reps tracking, auto progression | Complete | `v1.3` |
| **Phase 4** | Database snapshot import/restore, PRs hub, and 4-week training consistency heatmap | Complete | `v1.4` |
| **Maintenance & Reliability** | Context manager DB safety, progression status 500 fix, input validation, hold stopwatch, rest banner in runner | Complete | `v1.5` |

---

## 6. Notable Implementation Decisions & History

- **Skill Tree Refinement**: The complex SVG skill tree was removed in favor of clean Routine & Level management and an automated backend progression readiness engine (`/exercises/:id/progression-status`).
- **Rolling Split Anchor**: The 7-day rolling cycle (`Push A` → `Pull A` → `Legs A` → `Push B` → `Pull B` → `Legs B` → `Rest`) is calculated from `cx_cycle_start` in `localStorage`.
- **Idempotency Guarantee**: Submitting the same `client_uuid` multiple times returns HTTP 200/201 with the existing record, avoiding duplicate log rows during spotty network conditions.
- **Database Connection Safety**: All SQLite connections in `backend/app.py` utilize the `@contextmanager def get_db()` context manager with `PRAGMA foreign_keys = ON`, guaranteeing `conn.close()` even during unhandled exceptions or early function returns.
- **Input Validation in API**: Endpoints `add_level_exercise` and `update_level_exercise` validate and cast integer parameters (`sets`, `order_index`, `rest_sec`, etc.) and return descriptive HTTP 400 Bad Request responses on invalid inputs.
- **Dead Schema Cleanup**: The unused `progressions` table was dropped in favor of direct progression chain links on the `exercises` table (`prerequisite_id`, `next_id`, `progression_target_reps`, etc.).
- **Live Hold Stopwatch in Runner**: Active workout duration/hold sets are tracked via a dedicated live stopwatch (`startWorkoutHold` / `stopWorkoutHold`), saving actual measured seconds instead of target placeholders.
- **Runner Rest Countdown Banner**: Multi-set active workout execution features an interactive floating rest banner with tick countdown, sound/vibration cues, ±15s adjustments, and quick skip controls.
- **Timer Isolation Guarantee**: The standalone single-exercise log flow (`#log-<id>`, `openLogView`) uses separate state properties from the active multi-set runner, ensuring zero interference between both workflows.
- **Weighted Progression Readiness Engine**: `GET /exercises/:id/progression-status` scores readiness (0–100%) using a 60% target hit-rate and 40% RPE fatigue signal. If RPE >= 9, high fatigue limits the status to `almost_ready` to prevent premature advancement, with fallback to hit-rate when RPE is null.
