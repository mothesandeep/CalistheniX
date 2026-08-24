# Product Requirements Document (PRD) — CalistheniX

## 1. Problem Statement
Generic weight-lifting trackers (Hevy, Strong, FitNotes) model training almost exclusively as `sets × reps @ weight`. Calisthenics skill work — planche, front lever, L-sit, handstand progressions, muscle-ups — fundamentally relies on isometric `hold duration`, movement `tempo`, zero-rest `supersets`, and `progression tiers` (e.g., tuck front lever → advanced tuck → straddle → full). 

Mainstream workout loggers fail to represent these dimensions naturally. **CalistheniX** exists to close this gap with a focused, local-first, distraction-free tracker optimized for calisthenics athletes.

---

## 2. Goals & Value Proposition
- Provide a dedicated, single-user training cockpit for tracking a rolling 7-day PPL A/B split with both repetition-based and hold-based exercises.
- Provide immediate visual trend charts and delta metrics (% change over 2 weeks) to verify progression over time without manual mental math.
- Deliver a friction-free logging experience: every set log can be completed in under 10 seconds one-handed mid-session.
- Zero network reliance for active gym sessions via optimistic local-first caching and background synchronization.

**Explicit Non-Goal:** CalistheniX is not intended to be a bloated social fitness platform or generic lifting utility with paywalled cloud features.

---

## 3. Target User & Persona
- **Primary User:** Dedicated calisthenics athlete / bodyweight fitness practitioner.
- **Gym Environment:** Gyms with unreliable or non-existent Wi-Fi/cellular connection, mid-set fatigue, sweaty hands, requiring high-contrast dark mode and large touch targets.

---

## 4. Success Criteria
- Active use for consecutive training sessions without falling back to notes apps or spreadsheets.
- Logging any set takes **under 10 seconds**, including automatic hold duration capture.
- Trend line, progression status, and volume deltas are instantly readable.

---

## 5. Functional Requirements Matrix

| ID | Requirement | Category | Priority | Status |
|:---|:---|:---|:---|:---|
| **F1** | Pre-seeded calisthenics progression database (Push, Pull, Legs, Core) | Data Model | P0 | ✅ Implemented |
| **F2** | Log repetition-based sets: reps, optional added weight (kg), optional RPE (1–10) | Logging | P0 | ✅ Implemented |
| **F3** | Log isometric hold sets: one-tap start/stop timer with millisecond resolution & auto-save | Logging | P0 | ✅ Implemented |
| **F4** | Single-tap historical trend charts per exercise (Chart.js volume / hold metrics) | Analytics | P0 | ✅ Implemented |
| **F5** | Local-first persistence (`localStorage`) with background idempotent sync (`client_uuid`) | Resilience | P0 | ✅ Implemented |
| **F6** | Full database JSON export for backups | Data Portability | P0 | ✅ Implemented |
| **F7** | Multi-tier routine & level management (`routine_levels`, `level_exercises`, tempo, rest, supersets) | Routines | P0 | ✅ Implemented |
| **F8** | Rolling 7-day PPL A/B calendar split with automatic daily resolution | Scheduling | P0 | ✅ Implemented |
| **F9** | Dashboard analytics hub: streak counter, weekly volume, weekly sets, top movers | Analytics | P0 | ✅ Implemented |
| **F10** | Sensory feedback cues (Web Audio API synthetics + Vibration API haptic pulses) | UX / Cues | P1 | ✅ Implemented |
| **F11** | Exercise progression evaluation engine (`/exercises/:id/progression-status`) | Progression | P1 | ✅ Implemented |
| **F12** | Interactive routine editor (add, edit, delete, re-order, configure supersets) | Routine Mgmt | P1 | ✅ Implemented |
| **F13** | Multi-user authentication & cloud backup sync | Cloud | P3 | ⏳ Planned (Future) |

---

## 6. Non-Functional Requirements
- **Performance**: Instant UI responsiveness (<100ms render response time) with zero blocking network calls during workout logging.
- **Accessibility & UX**: High-contrast dark theme (#0d0d0f palette), tabular numerical typography (`JetBrains Mono`), and thumb-reachable primary action buttons.
- **Data Integrity**: Idempotent sync ensures duplicate submissions due to flaky connectivity never corrupt logs.
- **Infrastructure**: Lightweight Python Flask + SQLite backend running on zero-cost or self-hosted environments.

---

## 7. Out of Scope
- Calorie / macronutrient tracking.
- Social feeds, leaderboards, and profile sharing.
- Auto-generated AI programs.
- Bloated device camera posture analysis or video streaming.
