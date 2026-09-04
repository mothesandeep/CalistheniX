# Project Phases & Roadmap Ledger — CalistheniX

## Core Principle
CalistheniX is engineered with strict scope discipline: features are developed to solve genuine training friction experienced during real gym sessions, rather than speculative feature bloat.

---

## Master Roadmap Overview (Phases 0 through 16)

```
Phase 0: Baseline Audit & Safety (Complete)
   │
   ▼
Phase 1: Workout Session Foundation (Complete)
   │
   ▼
Phase 2: Today / Routine Separation (Complete)
   │
   ▼
Phase 3: Persistence, Sync & Data Reliability (Complete)
   │
   ▼
Phase 4: History as a Real Training Log (Complete)
   │
   ▼
Phase 5: Dashboard Reliability & Signal (Complete)
   │
   ▼
Phase 6: Workout Runner Execution Experience (Complete)
   │
   ▼
Phase 7: Progression System Overload Intelligence (Complete)
   │
   ▼
Phase 8: PR and Benchmark Tracking (Complete)
   │
   ▼
Phase 9: RPE and Fatigue Context (Complete)
   │
   ▼
Phase 10: Frontend Architecture Hardening & Modularity (Complete)
   │
   ▼
Phase 11: Automated Test Suite Expansion (Complete)
   │
   ▼
Phase 12: PWA & Offline Experience Hardening (Complete)
   │
   ▼
Phase 13: Documentation & Project Knowledge Base (Complete)
   │
   ▼
Phase 14: Custom 7-Day Training Splits & Schedule Engine (Complete)
   │
   ▼
Phase 15: Tri-Phase Workout Structure & Routine Templates (Complete)
   │
   ▼
Phase 16: Biomechanical Muscle Anatomy & Navigation Elevation (Complete)
```

---

## Comprehensive Phase Breakdown

### Phase 0 — Baseline Audit & Safety
- Full technical baseline verification.
- Dependency lock and environment verification (`Flask`, `Flask-Cors`, `SQLite3`).

### Phase 1 — Workout Session Foundation
- Canonical `workout_sessions` database table tracking routine name, level, start/end timestamps, and duration.
- `POST /workout_sessions` endpoint with duplicate idempotency.
- Live pause/resume runner with `totalPausedMs` exact duration calculation and crash recovery.

### Phase 2 — Today / Routine Separation
- **Today (`#home`)**: Pure execution launchpad with dynamic Hero card, key volume metrics, and active workout start CTA.
- **Routine (`#routine`)**: Program configuration blueprint displaying level selectors, tempos (`3010`), rest intervals, and superset groupings (`SS1`, `SS2`).

### Phase 3 — Persistence, Sync & Data Reliability
- Full versioned backup bundle export (`GET /export`, v2.0 schema).
- Multi-entity idempotent import (`POST /import`) skipping duplicates.
- Online/offline event listeners and outbox persistence (`cx_pending_logs`).

### Phase 4 — History as a Real Training Log
- **Unified History Feed (`#history_list`)**: Chronological workout session cards showing completion rate and duration.
- **Session Drilldown (`#session-<uuid>`)**: Exact recorded sets breakdown (reps/seconds, added kg, RPE).
- **Exercise Trend Charts (`#progress`)**: Chart.js charts with metric toggles (`Best Set` vs `Total Volume`).

### Phase 5 — Dashboard Reliability & Signal
- Dynamic streak calculation preserving yesterday's streak until today's session is logged.
- Rolling 7-day session count and sets volume aggregation.
- Instant parallel recalculation on workout completion.

### Phase 6 — Workout Runner Execution Experience
- Active exercise spotlight (`.workout-ex-card-active` + `Focus` badge).
- Inline stepper buttons (`+`/`-`) alongside direct numeric input.
- Dedicated isometric hold stopwatch saving exact measured seconds.
- Web Audio API and Vibration API sensory feedback.

### Phase 7 — Progression System Overload Intelligence
- `POST /exercises/<ex_id>/promote` endpoint replacing routine slots with next progression step.
- Interactive "Promote" banner action with level-up chime.
- 60% hit-rate weight + 40% fatigue credit, preventing premature progression when RPE >= 9.

### Phase 8 — PR and Benchmark Tracking
- Live in-workout PR detection across reps, hold duration, and added load (+kg).
- Instant celebratory audio chime and gold alert toast (`🏆 NEW PR!`) upon hitting all-time PRs.
- Dashboard PR leaderboard (`#prs`) with multi-attribute badges.

### Phase 9 — RPE and Fatigue Context
- `RPE_DESCRIPTIONS` dictionary mapping RPE 1–10 to Reps-in-Reserve (RIR) fatigue cues.
- Inline RPE dropdown selectors on active workout sets (`updateWorkoutSetRPE()`).
- Fatigue guard integration protecting athletes from overtraining.

### Phase 10 — Frontend Architecture Hardening & Modularity
- Clean domain modularity across state, audio synthesis, outbox sync, execution runner, and view components.
- Memory leak protection disposing timers (`stopTimer`, `stopRest`) and Chart.js canvas instances.

### Phase 11 — Automated Test Suite Expansion
- High-coverage unit tests in `backend/tests/` covering error handling, schema constraints, and service calculations.
- 68 tests passing in < 0.7s.

### Phase 12 — PWA & Offline Experience Hardening
- Service Worker v2.0 (`sw.js`) with explicit API route bypasses and offline fallback.
- Web App Manifest (`manifest.json`) with `#0a0a0f` dark mode theme and app shortcuts.

### Phase 13 — Documentation & Project Knowledge Base
- Complete production documentation suite ([README.md](README.md), [PRD.md](PRD.md), [architecture.md](architecture.md), [design.md](design.md), [memory.md](memory.md)).

### Phase 14 — Custom 7-Day Training Splits & Schedule Engine
- Multi-split management (`training_splits`, `weekly_schedules`, `workouts`, `workout_exercises`).
- Dynamic `/today` resolver automatically determining workout vs. rest day.
- Workout duplication and isolation (`POST /workouts/<id>/duplicate`).

### Phase 15 — Tri-Phase Workout Structure & Routine Templates
- Tri-phase schema tracking: Warm-Up (Amber), Main Training (Coral-Red), Cool-Down (Teal).
- Preset routine templates library (`GET /api/routine-templates`) for Full Body, Push, Pull, Legs, Handstand, Planche, Front Lever.
- Phase-specific timer tracking (`warmup_duration_sec`, `main_duration_sec`, `cooldown_duration_sec`).

### Phase 16 — Biomechanical Muscle Anatomy & Navigation Elevation
- Interactive front/back SVG muscle maps highlighting targeted muscle groups.
- Responsive desktop sidebar + mobile bottom navigation with smooth sliding indicators.
- User customization: theme toggles, custom phase accent colors, weight units (kg/lbs), and localization.

### Phase 17 — Settings Data Lifecycle & Canonical Demo Management
- Canonical 12-session, 237-log demo dataset across 5-Day PPL split with progressive overload, personal records, and bodyweight tracking.
- Automatic seeding on clean installation when no user data exists.
- Fully functional "Reset demo data" restoring canonical records with confirmation modal, preserving workout presets and custom settings.
- Fully functional "Reset everything" wiping all user/demo data back to empty state with confirmation modal, strictly preserving workout presets and preventing demo data resurrection.
- Seamless offline-first localStorage and SQLite backend synchronization with cache invalidation.

---

## Summary Milestones Ledger

| Phase | Focus Area | Status | Release Tag |
|:---|:---|:---|:---|
| **Phase 0** | Baseline Audit & Safety | Complete | `v2.0.0` |
| **Phase 1** | Workout Sessions Schema & API | Complete | `v2.0.0` |
| **Phase 2** | Today / Routine Separation | Complete | `v2.0.0` |
| **Phase 3** | Backup & Restore Bundle v2.0 | Complete | `v2.0.0` |
| **Phase 4** | History Log & Session Drilldown | Complete | `v2.0.0` |
| **Phase 5** | Dashboard Analytics & Streak | Complete | `v2.0.0` |
| **Phase 6** | Workout Runner Experience | Complete | `v2.0.0` |
| **Phase 7** | Progression Overload Intelligence | Complete | `v2.0.0` |
| **Phase 8** | PR & Benchmark Tracking | Complete | `v2.0.0` |
| **Phase 9** | RPE & Fatigue Context | Complete | `v2.0.0` |
| **Phase 10** | Frontend Architecture Hardening | Complete | `v2.0.0` |
| **Phase 11** | Automated Test Expansion | Complete | `v2.0.0` |
| **Phase 12** | PWA & Offline Hardening | Complete | `v2.0.0` |
| **Phase 13** | Documentation & Knowledge Base | Complete | `v2.0.0` |
| **Phase 14** | Custom 7-Day Training Splits | Complete | `v2.1.0` |
| **Phase 15** | Tri-Phase Workout Engine & Presets | Complete | `v2.1.0` |
| **Phase 16** | Muscle Anatomy & Navigation Elevation | Complete | `v2.1.0` |
| **Phase 17** | Settings Data Lifecycle & Demo System | Complete | `v2.4.0` |
