# Project Phases & Roadmap Ledger — CalistheniX

## Core Principle
CalistheniX is engineered with strict scope discipline: features are developed to solve genuine training friction experienced during real gym sessions, rather than speculative feature bloat.

---

## 📅 Roadmap Overview

```
Phase 0: Foundation, Schema & Seed Data (✅ Complete — v1.0.0)
   │
   ▼
Phase 1: Core Logging Loop, Hold Timer & JSON Export (✅ Complete — v1.1)
   │
   ▼
Phase 2: Routines, Levels, PWA Offline Shell & Progression Engine (✅ Complete — v1.2)
   │
   ▼
Phase 3: Active Workout Execution Runner & Auto-Promotion (✅ Complete — v1.3)
   │
   ▼
Phase 4: Database Snapshot Restore, PRs Hub & Training Consistency Heatmap (✅ Complete — v1.4)
```

---

## Phase Breakdown

### ✅ Phase 0 — Foundation & Infrastructure (Completed — v1.0.0)
- SQLite database schema initialization (`exercises`, `logs`, `routine_levels`, `level_exercises`).
- Flask REST API skeleton with CORS support.
- Static client application shell with dark theme CSS tokens.
- Seed data for calisthenics progressions (Push, Pull, Legs, Core).

### ✅ Phase 1 — Core Logging & Local-First Resilience (Completed — v1.1)
- **Today's Day View**: Automatic split detection and exercise list rendering.
- **Set Logging**: Repetition input, optional weight, RPE selector (1–10).
- **Hold Timer**: One-tap isometric timer with millisecond accuracy and auto-save on stop.
- **Local-First Caching**: Immediate `localStorage` writes with background sync loop.
- **Idempotent API**: Deduplication via `client_uuid`.
- **History Visualization**: Exercise performance charts via Chart.js with 2-week rolling delta analysis.
- **JSON Backup**: One-click database export.

### ✅ Phase 2 — Routines, Levels, PWA & Gym Sensory Cues (Completed — v1.2)
- **Routine & Level Management**: Multi-tier level definitions (Level 1–5), tempo, rest duration, and superset grouping (`SS1`, `SS2`).
- **Routine & Catalog Editor**: Inline exercise modification, re-ordering, and custom exercise creation in the catalog.
- **Rolling 7-Day Split Engine**: Dynamic PPL A/B split rotation (`Push A` → `Pull A` → `Legs A` → `Push B` → `Pull B` → `Legs B` → `Rest Day`).
- **Dashboard Analytics**: Streak counter, weekly volume, weekly completed sets, and top movers.
- **Sensory Gym Feedback**: Synthetic Web Audio beeps + Vibration API haptic pulses for hold start, hold save, rest tick, and rest completion.
- **Progression Readiness Engine**: Backend logic (`/exercises/:id/progression-status`) evaluating consecutive sessions at target performance.
- **PWA Offline Shell**: Manifest and service worker for 100% offline mobile app usage.

### ✅ Phase 3 — Active Workout Execution System (Completed — v1.3)
- **Active Workout Runner**: Live interactive session screen launched from Routine, Today, or Dashboard.
- **Live Set Tracking**: Side-by-side Target vs. Actual reps/duration entry per set (independent inputs).
- **Session Lifecycle**: Real-time duration timer, completed sets progress bar, set completion audio/vibration cues, and finish flow.
- **Automated Progression Promotion**: One-tap advancement to next exercise tier upon hitting progression criteria.

### ✅ Phase 4 — Cloud Backup, Snapshot Restore & Advanced Analytics (Completed — v1.4)
- **Database Backup & Snapshot Restore**: Full JSON database export and idempotent backup restoration (`POST /import`).
- **Personal Records (PRs) Hub**: All-time maximum reps, hold duration, and added weight badges per exercise (`GET /dashboard/records`).
- **Training Consistency Heatmap**: 4-week activity grid tracking session frequency and density (`GET /dashboard/activity`).

---

## 📊 Summary Milestones Ledger

| Phase | Focus Area | Status | Release Tag |
|:---|:---|:---|:---|
| **Phase 0** | Setup, Schema & Seeds | ✅ Complete | `v1.0.0` |
| **Phase 1** | MVP Logging & Charts | ✅ Complete | `v1.1` |
| **Phase 2** | Routines, Dashboard & PWA | ✅ Complete | `v1.2` |
| **Phase 3** | Active Workout Execution | ✅ Complete | `v1.3` |
| **Phase 4** | Backup Restore & Analytics | ✅ Complete | `v1.4` |
