# Project Phases & Roadmap Ledger — CalistheniX v2.0 🏆

## Core Principle
CalistheniX is engineered with strict scope discipline: features are developed to solve genuine training friction experienced during real gym sessions, rather than speculative feature bloat.

---

## 📅 Master Roadmap Overview (Phases 0 through 13)

```
Phase 0: Baseline Audit & Safety (✅ Complete)
   │
   ▼
Phase 1: Workout Session Foundation (✅ Complete)
   │
   ▼
Phase 2: Today / Routine Separation (✅ Complete)
   │
   ▼
Phase 3: Persistence, Sync & Data Reliability (✅ Complete)
   │
   ▼
Phase 4: History as a Real Training Log (✅ Complete)
   │
   ▼
Phase 5: Dashboard Reliability & Signal (✅ Complete)
   │
   ▼
Phase 6: Workout Runner Execution Experience (✅ Complete)
   │
   ▼
Phase 7: Progression System Overload Intelligence (✅ Complete)
   │
   ▼
Phase 8: PR and Benchmark Tracking (✅ Complete)
   │
   ▼
Phase 9: RPE and Fatigue Context (✅ Complete)
   │
   ▼
Phase 10: Frontend Architecture Hardening & Modularity (✅ Complete)
   │
   ▼
Phase 11: Automated Test Suite Expansion (✅ Complete)
   │
   ▼
Phase 12: PWA & Offline Experience Hardening (✅ Complete)
   │
   ▼
Phase 13: Documentation & Project Knowledge Base (✅ Complete)
```

---

## 📋 Comprehensive Phase Breakdown

### ✅ Phase 0 — Baseline Audit & Safety
- Full technical baseline documentation in [`baseline_audit.md`](baseline_audit.md).
- Dependency lock and environment verification (`Flask`, `Flask-Cors`, `SQLite3`).

### ✅ Phase 1 — Workout Session Foundation
- Canonical `workout_sessions` database table tracking routine name, level, start/end timestamps, and duration.
- `POST /workout_sessions` endpoint with duplicate idempotency.
- Live pause/resume runner with `totalPausedMs` exact duration calculation and crash recovery.

### ✅ Phase 2 — Today / Routine Separation
- **Today (`#home`)**: Pure execution launchpad with dynamic Hero card, key volume metrics, and active workout start CTA.
- **Routine (`#routine`)**: Program configuration blueprint displaying level selectors, tempos (`3010`), rest intervals, and superset groupings (`SS1`, `SS2`).

### ✅ Phase 3 — Persistence, Sync & Data Reliability
- Full versioned backup bundle export (`GET /export`, v2.0 schema).
- Multi-entity idempotent import (`POST /import`) skipping duplicates.
- Online/offline event listeners and outbox persistence (`cx_pending_logs`).

### ✅ Phase 4 — History as a Real Training Log
- **Unified History Feed (`#history`)**: Chronological workout session cards showing completion rate and duration.
- **Session Drilldown (`#session-<uuid>`)**: Exact recorded sets breakdown (reps/seconds, added kg, RPE).
- **Exercise Trend Charts (`#history-<id>`)**: Chart.js charts with metric toggles (`Best Set` vs `Total Volume`).

### ✅ Phase 5 — Dashboard Reliability & Signal
- Dynamic streak calculation preserving yesterday's streak until today's session is logged.
- Rolling 7-day session count and sets volume aggregation.
- Instant parallel recalculation on workout completion.

### ✅ Phase 6 — Workout Runner Execution Experience
- Active exercise spotlight (`.workout-ex-card-active` + `⚡ Focus` badge).
- Inline stepper buttons (`+`/`-`) alongside direct numeric input.
- Dedicated isometric hold stopwatch saving exact measured seconds.
- Web Audio API and Vibration API sensory feedback.

### ✅ Phase 7 — Progression System Overload Intelligence
- `POST /exercises/<ex_id>/promote` endpoint replacing routine slots with next progression step.
- Interactive "Promote 🚀" banner action with level-up chime.
- 60% hit-rate weight + 40% fatigue credit, preventing premature progression when RPE >= 9.

### ✅ Phase 8 — PR and Benchmark Tracking
- Live in-workout PR detection across reps, hold duration, and added load (+kg).
- Instant celebratory audio chime and gold alert banner upon hitting all-time PRs.
- Dashboard PR leaderboard with multi-attribute badges.

### ✅ Phase 9 — RPE and Fatigue Context
- `RPE_DESCRIPTIONS` dictionary mapping RPE 1–10 to Reps-in-Reserve (RIR) fatigue cues.
- Inline RPE dropdown selectors on active workout sets (`updateWorkoutSetRPE()`).
- Fatigue guard integration protecting athletes from overtraining.

### ✅ Phase 10 — Frontend Architecture Hardening & Modularity
- Clean domain modularity across state, audio synthesis, outbox sync, execution runner, and view components.
- Memory leak protection disposing timers (`stopTimer`, `stopRest`) and Chart.js canvas instances.

### ✅ Phase 11 — Automated Test Suite Expansion
- High-coverage unit tests in `backend/test_app.py` covering error handling (404/400 routes, dead-end promotions, API directory).
- 15/15 tests passing in < 0.04s.

### ✅ Phase 12 — PWA & Offline Experience Hardening
- Service Worker v2.0 (`sw.js`) with explicit API route bypasses and offline fallback.
- Web App Manifest (`manifest.json`) with `#0a0a0f` dark mode theme and app shortcuts.

### ✅ Phase 13 — Documentation & Project Knowledge Base
- Complete production [`README.md`](README.md), [`memory.md`](memory.md), and [`walkthrough.md`](walkthrough.md).

---

## 📊 Summary Milestones Ledger

| Phase | Focus Area | Status | Release Tag |
|:---|:---|:---|:---|
| **Phase 0** | Baseline Audit & Safety | ✅ Complete | `v2.0.0` |
| **Phase 1** | Workout Sessions Schema & API | ✅ Complete | `v2.0.0` |
| **Phase 2** | Today / Routine Separation | ✅ Complete | `v2.0.0` |
| **Phase 3** | Backup & Restore Bundle v2.0 | ✅ Complete | `v2.0.0` |
| **Phase 4** | History Log & Session Drilldown | ✅ Complete | `v2.0.0` |
| **Phase 5** | Dashboard Analytics & Streak | ✅ Complete | `v2.0.0` |
| **Phase 6** | Workout Runner Experience | ✅ Complete | `v2.0.0` |
| **Phase 7** | Progression Overload Intelligence | ✅ Complete | `v2.0.0` |
| **Phase 8** | PR & Benchmark Tracking | ✅ Complete | `v2.0.0` |
| **Phase 9** | RPE & Fatigue Context | ✅ Complete | `v2.0.0` |
| **Phase 10** | Frontend Architecture Hardening | ✅ Complete | `v2.0.0` |
| **Phase 11** | Automated Test Expansion | ✅ Complete | `v2.0.0` |
| **Phase 12** | PWA & Offline Hardening | ✅ Complete | `v2.0.0` |
| **Phase 13** | Documentation & Knowledge Base | ✅ Complete | `v2.0.0` |
