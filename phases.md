# Project Phases & Roadmap — CalistheniX

## Core Principle
CalistheniX is engineered with strict scope discipline: features are developed to solve genuine training friction experienced during real gym sessions, rather than speculative feature bloat.

---

## 📅 Roadmap Overview

```
Phase 0: Setup & Seed
   │
   ▼
Phase 1: Core Logging Loop & History Charting (✅ Complete)
   │
   ▼
Phase 2: Routine Levels, Supersets, Dashboard & Sensory Cues (✅ Complete)
   │
   ▼
Phase 3: Active Workout Execution Runner & Auto Progression (Current / Next)
   │
   ▼
Phase 4: PWA Packaging, Service Worker & Cloud Sync (Future)
```

---

## Phase Breakdown

### ✅ Phase 0 — Foundation & Infrastructure (Completed)
- SQLite database schema initialization (`exercises`, `logs`, `routine_levels`, `level_exercises`).
- Flask REST API skeleton with CORS support.
- Static client application shell with dark theme CSS tokens.
- Seed data for calisthenics progressions (Push, Pull, Legs, Core).

### ✅ Phase 1 — Core Logging & Local-First Resilience (Completed)
- **Today's Day View**: Automatic split detection and exercise list rendering.
- **Set Logging**: Repetition input, optional weight, RPE selector (1–10).
- **Hold Timer**: One-tap isometric timer with millisecond accuracy and auto-save on stop.
- **Local-First Caching**: Immediate `localStorage` writes with background sync loop.
- **Idempotent API**: Deduplication via `client_uuid`.
- **History Visualization**: Exercise performance charts via Chart.js with 2-week rolling delta analysis.
- **JSON Backup**: One-click database export.

### ✅ Phase 2 — Routines, Levels, Dashboard & Gym Sensory Cues (Completed)
- **Routine & Level Management**: Multi-tier level definitions (Level 1–5), tempo, rest duration, and superset grouping (`SS1`, `SS2`).
- **Routine Editor**: Inline exercise addition, modification, and re-ordering.
- **Rolling 7-Day Split Engine**: Dynamic PPL A/B split rotation (`Push A` → `Pull A` → `Legs A` → `Push B` → `Pull B` → `Legs B` → `Rest Day`).
- **Dashboard Analytics**: Streak counter, weekly volume, weekly completed sets, and top movers.
- **Sensory Gym Feedback**: Synthetic Web Audio beeps + Vibration API haptic pulses for hold start, hold save, rest tick, and rest completion.
- **Progression Readiness Engine**: Backend logic (`/exercises/:id/progression-status`) evaluating consecutive sessions at target performance.

### ✅ Phase 3 — Active Workout Execution System (Completed)
- **Active Workout Runner**: Live interactive session screen launched from Routine, Today, or Dashboard.
- **Live Set Tracking**: Side-by-side Target vs. Actual reps/duration entry per set (independent inputs).
- **Session Lifecycle**: Real-time duration timer, completed sets progress bar, set completion audio/vibration cues, and finish flow.
- **Automated Progression Promotion**: One-tap advancement to next exercise tier upon hitting progression criteria.

### 🔮 Phase 4 — Cloud Backup & Multi-Device Sync (Future Milestone)
- **Encrypted Cloud Sync**: Optional multi-device backup sync.
- **Advanced Training Analytics**: Multi-year progression heatmaps and volume load distribution.

---

## 📊 Summary Milestones

| Phase | Focus Area | Status | Gate to Complete |
|:---|:---|:---|:---|
| **Phase 0** | Setup, Schema & Seeds | ✅ Complete | Clean local execution |
| **Phase 1** | MVP Logging & Charts | ✅ Complete | <10s set logging, local-first writes |
| **Phase 2** | Routines, Dashboard & PWA | ✅ Complete | Full PPL A/B split, levels, rest cues |
| **Phase 3** | Active Workout Execution | ✅ Complete | Live session runner & actual rep tracking |
| **Phase 4** | Cloud Sync & Multi-Device | 🔮 Future | Multi-device encrypted sync |
