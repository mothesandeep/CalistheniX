# CalistheniX — Project Memory & Architecture Context

## Phase Progress (CalistheniX Master Improvement Roadmap)

### Phase 0: Baseline Audit & Safety (COMPLETED)
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

### Phase 2: Today / Routine Separation (COMPLETED)
- **Today (`#home`)**: Clean Execution Hub answering *"What should I do now?"*. Features dynamic Hero Card with Today's Split, key stats (Exercises count, ~Total sets, Est. duration), live status badge (`Ready to Train` / `In Progress` / `Paused` / `Rest Day`), One-tap Start/Resume button, and clean read-only exercise preview order without editing distractions.
- **Routine (`#routine` / `#split`)**: Pure Program Architecture & Configuration answering *"What does my program contain?"*.

### Phase 3: Persistence, Sync & Data Reliability (COMPLETED)
- **Backup & Restore v2.1**:
  - `GET /export`: Exports full backup bundle with versioning (`export_version: '2.1'`), `workout_sessions`, `logs`, `exercises`, `training_splits`, `weekly_schedules`, `workouts`, and `workout_exercises`.
  - `POST /import`: Idempotently restores entities validating JSON format and skipping duplicates without data corruption.
- **Client Resilience**: Added `online`/`offline` network event listeners, background sync retry loops, and dashboard Export/Import UI.

### Phase 4: History as a Real Training Log (COMPLETED)
- **Unified Workout History Log (`#history_list`)**: Shows chronological training session cards with Routine name, Level badge, Date/Time, Duration, and Sets completed with one-tap breakdown navigation.
- **Session Detail Breakdown (`#session-<uuid>`)**: Comprehensive breakdown showing exact recorded sets for every exercise in that session (reps/seconds, weight in kg, RPE rating).
- **Exercise Trends (`#progress`)**: Preserved single-exercise historical trend charts with Chart.js, metric toggles, and progression readiness scoring.

### Phase 5: Dashboard Reliability & Signal (COMPLETED)
- **Canonical Aggregates**:
  - `GET /dashboard/summary`: Computes dynamic streak days preserving yesterday's active streak until today's session is logged, distinct `week_sessions` in rolling 7-day window, and total `week_sets`.
  - `GET /dashboard/records`: Live PR leaderboards grouping top reps, hold seconds, and weighted load.
  - `GET /dashboard/activity`: 4-week training consistency volume aggregation.
- **Instant Recalculation Lifecycle**: Finishing an active workout immediately updates all dashboard aggregates in parallel without requiring page refresh.

### Phase 6: Workout Runner Execution Experience (COMPLETED)
- **Active Exercise Focus**: Dynamic `.workout-ex-card-active` with spotlight styling and glowing `Focus` badge on current in-progress exercise.
- **Tempo Prescription Guidance**: Inline tempo display pill (e.g., `Tempo: 3010`) maintaining strict form cues.
- **Frictionless Set Adjustments**: Added inline stepper buttons (`+` and `-`) alongside direct numeric input for one-tap set adjustments without opening mobile keyboards.
- **Audio & Haptic Signals**: Rest countdown warning ticks (3s, 2s, 1s), hold save confirmation, and set completion chimes via Web Audio API.

### Phase 7: Progression System Overload Intelligence (COMPLETED)
- **Promotion REST Endpoint**: `POST /exercises/<ex_id>/promote` replaces exercise slots across all routine levels with its configured `next_id` progression step automatically.
- **Interactive UI Progression Action**: One-tap "Promote" button on readiness banners immediately upgrades program configuration and triggers level-up celebration chime.
- **Fatigue Guard & Weighted Scoring**: 60% hit-rate weight + 40% RPE fatigue credit, preventing unsafe premature progressions when RPE >= 9.

### Phase 8: PR and Benchmark Tracking (COMPLETED)
- **Live In-Workout PR Detection**: Dynamically inspects each finished set against all-time records across max reps, hold duration, and added load (+kg).
- **Celebratory Fanfare & Audio**: Instant celebratory toast notification (`🏆 NEW PR!`) and fanfare trigger upon hitting an all-time PR during live workout training.
- **Multi-Dimensional PR Cards**: Dashboard PR leaderboard (`#prs`) renders multi-attribute badges (`X reps`, `Ys hold`, `+Zkg load`) with direct link to exercise progress charts.

### Phase 9: RPE and Fatigue Context (COMPLETED)
- **RIR Education & Real-Time Tooltips**: Added `RPE_DESCRIPTIONS` mapping RPE 1–10 to explicit Reps-in-Reserve (RIR) fatigue cues across logging buttons.
- **Active Runner Inline RPE Logging**: Added compact RPE select dropdowns on each set in the live runner (`updateWorkoutSetRPE()`).
- **Fatigue Guard Integration**: Integrated with progression readiness evaluation to protect athletes from overtraining when average RPE >= 9.

### Phase 10: Frontend Architecture Hardening & Modularity (COMPLETED)
- **Architectural Scoping**: Cleanly sectioned modules for Audio/Haptics, State & Outbox Sync, API Client, Active Runner Engine, History Engine, and UI View Renderers.
- **Memory Leak Protection**: Hardened timer disposal (`stopRest`, `stopTimer`, `_chartInstance.destroy()`) during view transitions.

### Phase 11: Automated Test Suite Expansion (COMPLETED)
- **High-Coverage Regression Suite**: Unit tests covering boundary calculations, 404/400 bad request guards, dead-end promotion protections, and API directory routing.
- **Test Performance**: **68/68 automated tests passing cleanly in < 0.7s**.

### Phase 12: PWA & Offline Experience Hardening (COMPLETED)
- **Service Worker v2.0**: Upgraded `sw.js` with explicit API route bypasses and offline fallback navigation.
- **Manifest & Aesthetics**: Configured standalone display with `#0a0a0f` dark mode theme background.

### Phase 13: Documentation & Project Knowledge Base (COMPLETED)
- **Comprehensive Production Documentation**: Synchronized `README.md`, `PRD.md`, `architecture.md`, `design.md`, `phases.md`, and `memory.md`.

### Phase 14: Custom 7-Day Training Splits & Schedule Engine (COMPLETED)
- Added `training_splits` and `weekly_schedules` relational tables with cascade constraints.
- Dynamic `/today` resolver automatically determining workout vs. rest days and previews.
- Workout duplication and isolation (`POST /workouts/<id>/duplicate`).

### Phase 15: Tri-Phase Workout Structure & Routine Templates (COMPLETED)
- Implemented tri-phase execution: Warm-Up (Amber), Main Workout (Coral-Red), Cool-Down (Teal).
- Added preset routine templates library (`GET /api/routine-templates`) for Full Body, Push, Pull, Legs, Handstand, Planche, Front Lever.
- Multi-phase duration accounting (`warmup_duration_sec`, `main_duration_sec`, `cooldown_duration_sec`).

### Phase 16: Biomechanical Muscle Anatomy & UI/UX Elevation (COMPLETED)
- Interactive anterior and posterior SVG muscle map visualizers.
- Responsive desktop sidebar (`>= 1024px`) and mobile header/bottom nav (`< 1024px`) with dynamic sliding pill indicators.
- Athlete customization: light/dark/system theme, custom phase accent colors, weight units (`kg`/`lbs`), and localization.

---

## 1. Project Identity & Purpose

**CalistheniX** is a local-first, aesthetic calisthenics progression tracker and live workout runner specifically built for bodyweight skill work and progressive overload. Unlike traditional lifting apps that model only `weight × reps`, CalistheniX natively tracks isometric hold duration, movement tempo (e.g., `3010`), rest intervals, superset pairings, multi-phase workout structures, live active workout sessions, all-time personal records (PRs), and training consistency heatmaps.

---

## 2. Core Architecture & Tech Stack

- **Frontend Server**: Python HTTP server on port `8080` (`python3 -m http.server 8080 --directory frontend`).
- **Backend API**: Python Flask on port `5001` (`python3 run.py` or `python3 backend/app.py`).
- **Database**: SQLite at `backend/tracker.db` with `PRAGMA foreign_keys = ON` and composite B-tree performance indexes.
- **Test Suite**: 68 passing tests (`PYTHONPATH=. pytest backend/tests`).

---

## 3. Key Invariants & Design Principles

1. **Local-First & Offline Resilience**:
   - Every log action is written to `localStorage` immediately.
   - UI shows instant success checkmarks without waiting for backend network roundtrips.
   - Background sync pushes pending logs to `POST /logs` and `POST /workout_sessions` with client UUIDs for idempotent deduplication.
2. **Gym-Usable Ergonomics**:
   - One-handed operation, massive tap targets (minimum 44×44px).
   - High-contrast dark theme (`#0a0a0f` canvas, `#12121a` surface) with tri-phase accent system (Amber `#f59e0b`, Coral-Red `#FF5D5D`, Teal `#14b8a6`, Gold `#eab308`).
   - Monospace typography (`JetBrains Mono`) for numbers, timers, and tabular metrics.
   - Tactile feedback: Synthetic Web Audio beeps + Vibration API haptic pulses for hold save, rest tick, and rest end.
3. **No Unnecessary Dependencies**:
   - Pure vanilla JavaScript and CSS without build pipelines (no Node runtime or bundler required).
   - All sound cues are generated procedurally via the browser's Web Audio API oscillators.

---

## 4. Notable Implementation Decisions & History

- **Custom Split & 7-Day Matrix**: Migrated from rigid cycle anchors to full custom training splits (`training_splits` and `weekly_schedules`) with independent Monday–Sunday day configurations.
- **Tri-Phase Workout Architecture**: Delineated every workout into Warm-up, Main training, and Cool-down phases, capturing distinct duration metrics and completion statuses.
- **Idempotency Guarantee**: Submitting the same `client_uuid` or `session_uuid` multiple times returns HTTP 200/201 with the existing record, avoiding duplicate log rows during spotty network conditions.
- **Database Connection Safety**: All SQLite connections utilize the `@contextmanager def get_db()` pattern with `PRAGMA foreign_keys = ON`, guaranteeing clean closures and rollback safety.
- **Live Hold Stopwatch in Runner**: Active workout duration/hold sets are tracked via a dedicated live stopwatch (`startWorkoutHold` / `stopWorkoutHold`), saving actual measured seconds.
- **Weighted Progression Readiness Engine**: `GET /exercises/:id/progression-status` scores readiness (0–100%) using a 60% target hit-rate and 40% RPE fatigue signal. If RPE >= 9, high fatigue limits the status to `almost_ready` to prevent premature advancement.
